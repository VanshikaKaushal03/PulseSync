from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List
from datetime import datetime

class OrderItem(BaseModel):
    """Individual item in an order (shows nested document handling)"""
    product_id: str
    product_name: str
    sku: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)
    subtotal: float = Field(ge=0)



class OrderBase(BaseModel):
    # Customer info
    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_email: Optional[str] = None
    
    # Order details
    items: List[OrderItem] = Field(default_factory=list)  # Shows array updates
    
    # Status tracking
    status: Literal["pending", "processing", "shipped", "delivered", "cancelled"] = "pending"
    
    # Financial
    total_amount: float = Field(default=0.0, ge=0)
    
    # Metadata
    notes: Optional[str] = None
    priority: Literal["low", "medium", "high"] = "medium"

    # Visual Layout and Rich tracking additions
    category: Optional[str] = "general"
    estimated_delivery: Optional[datetime] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    delivery_progress: Optional[float] = 0.0
    last_checkpoint: Optional[str] = None
    shipping_address: Optional[str] = None
    payment_method: Optional[str] = None


class OrderInDB(OrderBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # For tracking changes
    version: int = 1  # Optimistic locking / conflict detection
    status_history: List[dict] = Field(default_factory=list)  # Audit trail

    model_config = ConfigDict(populate_by_name=True)
