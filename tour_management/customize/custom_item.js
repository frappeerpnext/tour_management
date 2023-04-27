frappe.ui.form.on('Item', {
    standard_rate: function(frm) {
        frm.set_value('net_sale_price', frm.doc.standard_rate - frm.doc.expense_commission);
        frm.refresh();
	},
    expense_commission: function(frm) {
        frm.set_value('net_sale_price', frm.doc.standard_rate - frm.doc.expense_commission);
        frm.refresh();
	},
});