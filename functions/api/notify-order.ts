import { Order } from "../../src/types";
import { Resend } from "resend";

interface Env {
  RESEND_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  try {
    const { order, customerEmail, storeEmail } = await request.json() as any;

    if (!order) {
      return new Response(JSON.stringify({ error: "Order data is required" }), { status: 400 });
    }

    const orderDetails = (order.items || []).map((item: any) => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');

    const htmlTemplate = (title: string, intro: string) => `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; color: #333;">
        <div style="background-color: #1a1a1a; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Family Store</h1>
          <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.7;">Kent County • Order confirmation</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="font-size: 18px; color: #1a1a1a; margin-top: 0;">${title}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #666;">${intro}</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase;">Order ID</p>
            <p style="margin: 5px 0 0; font-family: monospace; font-size: 16px;">#${order.id.toUpperCase()}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="color: #999; text-transform: uppercase; font-size: 10px; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #eee;">Item</th>
                <th style="padding: 10px; border-bottom: 2px solid #eee; text-align: center;">Qty</th>
                <th style="padding: 10px; border-bottom: 2px solid #eee; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetails}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Grand Total</td>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #1a1a1a;">£${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
            <h3 style="font-size: 12px; text-transform: uppercase; color: #999; margin: 0 0 10px;">Delivery to:</h3>
            <p style="font-size: 13px; margin: 0; font-weight: bold;">${order.customerName}</p>
            <p style="font-size: 13px; margin: 5px 0; color: #666; line-height: 1.4;">${order.deliveryAddress}</p>
            <p style="font-size: 13px; margin: 0; color: #666; font-family: monospace;">${order.customerPhone || ''}</p>
          </div>
        </div>
        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 11px; color: #999;">
          <p>© 2026 Family Store Kent. All rights reserved.</p>
        </div>
      </div>
    `;

    const telegramMessage = `
📦 *New Order Received!*
-------------------------
Order: \`#${order.id.slice(-6).toUpperCase()}\`
Total: *£${order.totalAmount.toFixed(2)}*

*Customer:*
${order.customerName}
${order.customerPhone || 'No Phone'}
${order.deliveryAddress}

*Items:*
${(order.items || []).map((i: any) => `- ${i.name} (x${i.quantity})`).join('\n')}
    `.trim();

    // 1. Send Emails
    if (resend) {
      const verifiedEmail = 'rahil1191@gmail.com';
      
      // To Store
      await resend.emails.send({
        from: 'Family Store <onboarding@resend.dev>',
        to: storeEmail?.toLowerCase() || verifiedEmail,
        subject: `🚨 NEW ORDER #${order.id.slice(-6).toUpperCase()}`,
        html: htmlTemplate("New Order Notification", "You have received a new order from your store. Details are below.")
      });

      // To Customer
      if (customerEmail?.toLowerCase() === verifiedEmail) {
        await resend.emails.send({
          from: 'Family Store <onboarding@resend.dev>',
          to: customerEmail.toLowerCase(),
          subject: 'Order Confirmed - Family Store',
          html: htmlTemplate("Order Confirmed!", "Thank you for shopping with Family Store. Your order is being processed and will be with you soon.")
        });
      }
    }

    // 2. Telegram
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      const telUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      await fetch(telUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'Markdown'
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
