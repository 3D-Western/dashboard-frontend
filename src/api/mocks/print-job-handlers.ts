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

  // POST /orders - Create new order (Step 1: Returns presigned URL)
  http.post(`${apiUrl}${endpoints.orders.create}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const body = (await request.json()) as {
      printName: string;
      description: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      // 3D Print specific fields
      goal?: string;
      durability?: string;
      infill?: string;
      material1?: string;
      color1?: string;
      material2?: string;
      color2?: string;
      support?: string;
      // CNC/Laser/WaterJet specific fields
      material?: string;
      priority?: string;
      urgency?: string;
    };

    // Generate IDs
    const orderId = `order-${Date.now()}`;
    const fileId = `file-${Date.now()}`;

    // Create order with PendingFile status
    const newOrder = {
      id: orderId,
      kind: 'active-print-job' as const,
      studentId: user.studentId,
      name: body.printName,
      description: body.description,
      orderPlaced: new Date().toISOString(),
      status: 'PendingFile' as const,
      reprint: null,
      category: '3d-print',
      // 3D Print specific fields
      goal: body.goal,
      durability: body.durability,
      infill: body.infill,
      material1: body.material1 || body.material,
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

    // Return presigned URL response
    const mockPresignedUrl = `http://mock-storage.local/uploads/${fileId}?signature=mock`;

    return HttpResponse.json(
      generateSuccessResponse({
        orderId,
        createdAt: newOrder.orderPlaced,
        fileId,
        uploadUrl: mockPresignedUrl,
        uploadExpiresIn: 900, // 15 minutes
      }),
      { status: 201 },
    );
  }),

  // POST /orders/:orderId/complete-upload (Step 3: Complete upload)
  http.post(
    `${apiUrl}/api/v1/orders/:orderId/complete-upload`,
    async ({ cookies, params, request }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      const { orderId } = params;
      (await request.json()) as { checksum: string };

      // Find the order
      const order = db.getPrintJobs({ userId: user.studentId }).find((o) => o.id === orderId);
      if (!order) {
        return HttpResponse.json(
          { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
          { status: 404 },
        );
      }

      // Check if order is in PendingFile status
      if (order.status !== 'PendingFile') {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATUS',
              message: 'Only orders with PendingFile status can complete upload',
            },
          },
          { status: 409 },
        );
      }

      // Update order status to InQueue
      db.updatePrintJobStatus(orderId as string, 'InQueue');

      return HttpResponse.json(generateSuccessResponse({ data: null }));
    },
  ),

  // POST /orders/:orderId/retry-upload (Retry presigned URL)
  http.post(`${apiUrl}/api/v1/orders/:orderId/retry-upload`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { orderId } = params;

    // Find the order
    const order = db.getPrintJobs({ userId: user.studentId }).find((o) => o.id === orderId);
    if (!order) {
      return HttpResponse.json(
        { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
        { status: 404 },
      );
    }

    // Check if order is in PendingFile status
    if (order.status !== 'PendingFile') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Only orders with PendingFile status can retry upload',
          },
        },
        { status: 409 },
      );
    }

    // Return new presigned URL
    const mockFileId = `file-retry-${Date.now()}`;
    const mockPresignedUrl = `http://mock-storage.local/uploads/${mockFileId}?signature=mock-retry`;

    return HttpResponse.json(
      generateSuccessResponse({
        fileId: mockFileId,
        presignedUrl: mockPresignedUrl,
        expiresIn: 900,
        storageKey: `prints/tmp/${mockFileId}`,
      }),
    );
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
