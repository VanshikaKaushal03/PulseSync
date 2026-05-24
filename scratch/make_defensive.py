import re

file_path = "frontend/src/pages/ClientTracker.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's perform robust replacements for all potential undefined elements
replacements = [
    # 1. stats.totalValue
    (r'stats\.totalValue\.toFixed\(2\)', r'(stats.totalValue || 0).toFixed(2)'),
    
    # 2. order.total_amount
    (r'order\.total_amount\.toFixed\(2\)', r'(order.total_amount || 0).toFixed(2)'),
    
    # 3. selectedOrder.total_amount
    (r'selectedOrder\.total_amount\.toFixed\(2\)', r'(selectedOrder.total_amount || 0).toFixed(2)'),
    
    # 4. item.unit_price and item.subtotal
    (r'item\.unit_price\.toFixed\(2\)', r'(item.unit_price || 0).toFixed(2)'),
    (r'item\.subtotal\.toFixed\(2\)', r'(item.subtotal || 0).toFixed(2)'),
    
    # 5. selectedProduct.price and p.price
    (r'selectedProduct\.price\.toFixed\(2\)', r'(selectedProduct.price || 0).toFixed(2)'),
    (r'p\.price\.toFixed\(2\)', r'(p.price || 0).toFixed(2)'),
    
    # 6. subtotal preview calculation
    (r'\(selectedProduct\.price \* orderQuantity\)\.toFixed\(2\)', r'((selectedProduct.price || 0) * orderQuantity).toFixed(2)'),
    
    # 7. order.items[0] optional chaining safety
    (r'order\.items\[0\]\.product_name', r"(order.items[0]?.product_name || 'Unknown Item')"),
    (r'order\.items\[0\]\.quantity', r"(order.items[0]?.quantity || 1)"),
    (r'order\.items\[0\]\.unit_price', r"(order.items[0]?.unit_price || 0)")
]

new_content = content
for pattern, replacement in replacements:
    new_content, count = re.subn(pattern, replacement, new_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Defensive standardisation complete successfully!")
