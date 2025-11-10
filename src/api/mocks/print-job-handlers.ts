import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

// Active statuses for filtering
const ACTIVE_STATUSES = ['IN_QUEUE', 'PRINTING', 'READY', 'FLAGGED', 'ERROR'];
const COMPLETED_STATUSES = ['SUCCESS', 'FAIL'];

export const orderHandlers = [
  // GET /orders with query params (status, user_id)
  http.get(`${apiUrl}${endpoints.orders.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Parse query parameters
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status'); // 'active' | 'completed' | null
    const userIdFilter = url.searchParams.get('user_id');

    // Get all jobs
    let orders = db.getAllPrintJobs();

    // Filter by user_id if provided
    if (userIdFilter) {
      orders = orders.filter((order) => order.studentId === parseInt(userIdFilter));
    } else if (user.role !== 'admin') {
      // Non-admin users can only see their own orders
      orders = orders.filter((order) => order.studentId === user.id);
    }

    // Filter by status if provided
    if (statusFilter === 'active') {
      orders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
    } else if (statusFilter === 'completed') {
      orders = orders.filter((order) => COMPLETED_STATUSES.includes(order.status));
    }

    // For admin users, populate student info
    if (user.role === 'admin') {
      orders = orders.map((order) => {
        const student = db.getUserById(order.studentId);
        return {
          ...order,
          student: student
            ? {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
              }
            : undefined,
        };
      });
    }

    return HttpResponse.json(generateSuccessResponse({ jobs: orders }));
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
      studentId: user.id,
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
