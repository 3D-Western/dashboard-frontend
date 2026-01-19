import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

export const orderHandlers = [
  // GET /orders with query params (status, userId, pagination)
  http.get(`${apiUrl}${endpoints.orders.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Parse query parameters
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const searchFilter = url.searchParams.get('search');
    const userIdFilter = url.searchParams.get('userId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    // Determine the userId filter based on role
    let userIdForFilter: number | undefined;
    if (userIdFilter) {
      userIdForFilter = parseInt(userIdFilter);
    } else if (user.role !== 'admin') {
      // Non-admin users can only see their own orders
      userIdForFilter = user.studentId;
    }

    // Get print jobs using the shared function with filters
    let orders = db.getPrintJobs({
      userId: userIdForFilter,
      status: statusFilter || undefined,
      search: searchFilter || undefined,
      snapshotCreatedBefore,
    });

    // For admin users, populate student info
    if (user.role === 'admin') {
      orders = orders.map((order) => {
        const student = db.getUserById(order.studentId);
        return {
          ...order,
          student: student
            ? {
                studentId: student.studentId,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
              }
            : undefined,
        };
      });
    }

    // Calculate pagination
    const totalItems = orders.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return HttpResponse.json(
      generateSuccessResponse({
        data: paginatedOrders,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          snapshotCreatedBefore,
        },
      }),
    );
  }),

  // POST /orders - Create new order
  http.post(`${apiUrl}${endpoints.orders.create}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const body = (await request.json()) as {
      category?: string;
      name: string;
      description: string;
      // 3D Print specific fields
      goal?: string;
      durability?: string;
      infill?: string;
      material1?: string;
      color1?: string;
      material2?: string;
      color2?: string;
      support?: string;
      stlFileId?: string;
      reprint?: string | null;
      // CNC/Laser/WaterJet specific fields
      material?: string;
      fileId?: string;
      priority?: string;
      urgency?: string;
    };

    // Create new order and add to database
    const category = body.category || '3d-print';
    const fileId = body.stlFileId || body.fileId || `mock-${category}-file-${Date.now()}`;

    // Helper function to get appropriate file extension and name based on category
    const getFileDetails = (category: string) => {
      switch (category) {
        case '3d-print':
          return { extension: '.stl', name: 'design.stl' };
        case 'cnc':
          return { extension: '.stl', name: 'design.stl' };
        case 'laser-cutting':
          // DXF is the most common format for laser cutting (also supports .ai, .svg, .dwg)
          return { extension: '.dxf', name: 'design.dxf' };
        case 'water-jet':
          // DXF is the most common format for water jet cutting (also supports .ai, .svg, .dwg)
          return { extension: '.dxf', name: 'design.dxf' };
        default:
          return { extension: '.stl', name: 'design.stl' };
      }
    };

    const fileDetails = getFileDetails(category);

    const newOrder = {
      id: `order-${Date.now()}`,
      kind: 'active-print-job' as const,
      studentId: user.studentId,
      name: body.name,
      description: body.description,
      orderPlaced: new Date().toISOString(),
      status: 'IN_QUEUE' as const,
      stlFile: {
        id: fileId,
        name: fileDetails.name,
        path: `/uploads/${fileDetails.name}`,
      },
      reprint: body.reprint || null,
      // Store category for filtering/display
      category: category,
      // 3D Print specific fields
      goal: body.goal,
      durability: body.durability,
      infill: body.infill,
      material1: body.material1 || body.material, // Support both formats
      color1: body.color1,
      material2: body.material2,
      color2: body.color2,
      support: body.support,
      // CNC/Laser/WaterJet specific fields
      material: body.material,
      priority: body.priority,
      urgency: body.urgency,
    };
    db.addPrintJob(newOrder);

    return HttpResponse.json(generateSuccessResponse({ order: newOrder }));
  }),

  // PATCH /orders/:orderId - Update order status
  http.patch(`${apiUrl}/api/v1/orders/:orderId`, async ({ cookies, params, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can update order status
    if (user.role !== 'admin') {
      return HttpResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 },
      );
    }

    const { orderId } = params;
    const body = (await request.json()) as { status: string };

    const updatedOrder = db.updatePrintJobStatus(orderId as string, body.status);
    if (!updatedOrder) {
      return HttpResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return HttpResponse.json(generateSuccessResponse({ order: updatedOrder }));
  }),

  // DELETE /orders/:orderId
  http.delete(`${apiUrl}/api/v1/orders/:orderId`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can delete orders
    if (user.role !== 'admin') {
      return HttpResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 },
      );
    }

    const { orderId } = params;
    const success = db.deletePrintJob(orderId as string);
    if (!success) {
      return HttpResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return HttpResponse.json(generateSuccessResponse({ success: true }));
  }),
];
