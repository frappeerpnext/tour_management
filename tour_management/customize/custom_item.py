import frappe
from erpnext.stock.doctype.item.item import Item

class CustomItem(Item):
    def validate(self):
        super().validate()