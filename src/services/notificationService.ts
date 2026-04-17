import { Order } from "../types";
import { STORE_CONFIG } from "../config";

export async function sendOrderNotifications(order: Order) {
  try {
    const response = await fetch('/api/notify-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order,
        customerEmail: order.customerEmail,
        storeEmail: STORE_CONFIG.contactEmail,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send notifications');
    }

    console.log('Notifications sent successfully');
  } catch (error) {
    console.error('Notification error:', error);
    // Silent fail in UI but log to console
  }
}
