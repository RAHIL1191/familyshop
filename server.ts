import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  app.use(express.json());

  // API Routes
  app.post('/api/notify-order', async (req, res) => {
    const { order, customerEmail, storeEmail } = req.body;

    console.log(`[API] Processing notifications for order: ${order?.id}`);

    if (!order) {
      return res.status(400).json({ error: 'Order data is required' });
    }

    const orderDetailsHtml = (order.items || []).map((item: any) => 
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
              ${orderDetailsHtml}
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
Total: *£${order.totalAmount?.toFixed(2)}*

*Customer Info:*
Name: ${order.customerName}
Phone: ${order.customerPhone || 'N/A'}
Email: ${order.customerEmail}
Address: ${order.deliveryAddress}

*Items:*
${(order.items || []).map((i: any) => `- ${i.name} (x${i.quantity})`).join('\n')}
    `.trim();

    try {
      // 1. Send Email via Resend
      if (resend) {
        console.log('[API] Attempting to send fancy emails via Resend...');
        
        // To Store
        const storeRes = await resend.emails.send({
          from: 'Family Store <onboarding@resend.dev>', 
          to: storeEmail?.toLowerCase() || 'rahil1191@gmail.com',
          subject: `🚨 New Store Order #${order.id.slice(-6).toUpperCase()}`,
          html: htmlTemplate("New Order Notification", "A customer has placed a new order. Summary below."),
        });

        if (storeRes.error) {
          console.error('[API] Resend Store Email Error:', storeRes.error);
        } else {
          console.log('[API] Store email sent successfully:', storeRes.data?.id);
        }

        // To Customer
        const verifiedEmail = 'rahil1191@gmail.com';
        if (customerEmail?.toLowerCase() === verifiedEmail) {
          const customerRes = await resend.emails.send({
            from: 'Family Store <onboarding@resend.dev>',
            to: customerEmail.toLowerCase(),
            subject: '📦 Order Confirmed - Family Store',
            html: htmlTemplate("Order Confirmed!", "Your essentials are on the way! Thank you for shopping with Family Store."),
          });

          if (customerRes.error) {
            console.error('[API] Resend Customer Email Error:', customerRes.error);
          } else {
            console.log('[API] Customer email sent successfully:', customerRes.data?.id);
          }
        }
      } else {
        console.log('[API] Skipping Resend: RESEND_API_KEY not found in environment.');
      }

      // 2. Telegram Notification
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        console.log('[API] Attempting to send Telegram notification...');
        const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        const telResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: telegramMessage,
            parse_mode: 'Markdown',
          }),
        });
        
        if (!telResponse.ok) {
          const errorData = await telResponse.json();
          console.error('[API] Telegram Error:', errorData);
        } else {
          console.log('[API] Telegram message sent.');
        }
      } else {
        console.log('[API] Skipping Telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing.');
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Notification error:', error);
      res.status(500).json({ error: 'Failed to send notifications' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
