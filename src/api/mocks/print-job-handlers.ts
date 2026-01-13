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
                id: student.studentId,
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
      name: string;
      description: string;
      stlFileId: string;
      reprint?: string | null;
    };

    // TODO: Implement order creation in database
    // For now, return a mock response
    const newOrder = {
      id: `order-${Date.now()}`,
      kind: 'active-print-job' as const,
      studentId: user.studentId,
      name: body.name,
      description: body.description,
      orderPlaced: new Date().toISOString(),
      status: 'IN_QUEUE' as const,
      stlFile: {
        id: body.stlFileId,
        name: 'file.stl',
        path: '/uploads/file.stl',
      },
      reprint: body.reprint,
    };

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
