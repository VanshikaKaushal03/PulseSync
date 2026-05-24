from typing import Dict, Any, List

def evaluate_filter(event: Dict[str, Any], filters: Dict[str, Any], current_state: Dict[str, Any] = None) -> bool:
    """
    Evaluates if an event (or the current state of the document) matches the given filters.
    filters example: {"status": "shipped", "priority": "high"}
    """
    if not filters:
        return True # No filters means subscribe to all

    # If it's an insert or replace, we check the full document
    if event.get("operation") in ["insert", "replace"] and "full_document" in event:
        doc = event["full_document"]
        for key, value in filters.items():
            if doc.get(key) != value:
                return False
        return True

    # If it's an update, we should ideally check the combined state of the document.
    # We use current_state if provided (fetched from DB).
    if event.get("operation") == "update":
        # We check full state if provided (injected by cdc_listener)
        current_state_to_check = current_state or event.get("_full_state")
        
        if current_state_to_check:
            for key, value in filters.items():
                if current_state_to_check.get(key) != value:
                    return False
            return True
        else:
            # If current_state is not provided, we only check if the updated fields
            # match the filter (simplistic approach for demonstration)
            updated_fields = event.get("updated_fields", {})
            
            # If the filter key was updated, check it
            matched_any = False
            for key, value in filters.items():
                if key in updated_fields:
                    if updated_fields[key] != value:
                        return False
                    matched_any = True
            
            # If none of the filtered fields were updated, we might falsely drop or send.
            # In a robust system, we MUST fetch the current state or keep it in memory.
            # For this demo, if the updated fields don't violate the filter, we pass it if it matched something,
            # or we just pass it assuming it already matched. 
            # Best practice: always fetch the current state for complex filtering on updates.
            return True

    # For delete, we usually just pass it through if they were subscribed
    return True
