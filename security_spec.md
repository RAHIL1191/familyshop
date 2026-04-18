# Security Specification - Family Store

## Data Invariants
1. Orders must have a valid `userId` (authenticated UID or 'guest').
2. Orders must contain at least one item.
3. Order total must be positive.
4. Users can only read/write their own orders (unless admin or guest).
5. Products can only be modified by Admins, EXCEPT for `stockQuantity` decrements during checkout.
6. User profiles can only be written by the owner or admin.
7. Admin role is protected and cannot be self-assigned.

## The "Dirty Dozen" Payloads (Deny cases)
1. **Identity Injection**: Guest tries to create an order with a real user's UID.
2. **Price Poisoning**: Customer tries to update a product price to £0.01.
3. **Stock Tampering**: Customer tries to set product stock to 99999.
4. **Role Escalation**: Customer tries to update their own role to 'admin'.
5. **Orphaned Order**: Creating an order for a product that doesn't exist (relational sync).
6. **Shadow Field**: Adding `isVerified: true` to a product.
7. **Negative Total**: Creating an order with `totalAmount: -50.00`.
8. **Invalid ID**: Using a 1MB string as a productId.
9. **Email Spoofing**: Setting `email_verified: true` in user profile without Auth verification.
10. **State Shortcut**: Customer tries to update order status to 'delivered'.
11. **PII Leak**: Guest tries to read another guest's order by guessing ID.
12. **Recursive Attack**: Blanket list query on all orders without userId filter.
