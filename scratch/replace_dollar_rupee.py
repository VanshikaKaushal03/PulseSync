import re

file_path = "frontend/src/pages/ClientTracker.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace $ formatting that represents currency
replacements = [
    # 1. Total spent metric card
    (r'`\$\$\{stats.totalValue.toFixed\(2\)\}`', r'`₹${stats.totalValue.toFixed(2)}`'),
    # 2. Table row price display
    (r'\$\{order.total_amount.toFixed\(2\)\}', r'₹{order.total_amount.toFixed(2)}'),
    # 3. Timeline row price display
    (r'\$\{order.total_amount.toFixed\(2\)\}', r'₹{order.total_amount.toFixed(2)}'),
    # 4. Catalog select options
    (r'\$\{p.price.toFixed\(2\)\}', r'₹{p.price.toFixed(2)}'),
    # 5. Snapshot price label
    (r'Snapshot Price: \$\{selectedProduct.price.toFixed\(2\)\}', r'Snapshot Price: ₹{selectedProduct.price.toFixed(2)}'),
    # 6. Sidebar subtotal preview
    (r'\$\{\(selectedProduct.price \* orderQuantity\).toFixed\(2\)\}', r'₹{(selectedProduct.price * orderQuantity).toFixed(2)}'),
    # 7. Modal detail header total
    (r'\$\{selectedOrder.total_amount.toFixed\(2\)\}', r'₹{selectedOrder.total_amount.toFixed(2)}'),
    # 8. Modal detail item Qty price preview
    (r'@ \$\{item.unit_price.toFixed\(2\)\}', r'@ ₹{item.unit_price.toFixed(2)}'),
    # 9. Modal detail item subtotal
    (r'\$\{item.subtotal.toFixed\(2\)\}', r'₹{item.subtotal.toFixed(2)}'),
    # 10. Kanban card price preview
    (r'\$\{order.total_amount.toFixed\(2\)\}', r'₹{order.total_amount.toFixed(2)}')
]

new_content = content
for pattern, replacement in replacements:
    new_content, count = re.subn(pattern, replacement, new_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Rupee migration complete successfully!")
