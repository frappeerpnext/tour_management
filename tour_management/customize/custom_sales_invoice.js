frappe.ui.form.on('Sales Invoice', {
  refresh: function (frm) {
    frm.add_custom_button(__('Create Tour Transactions'), function () {
      frappe.route_options = { "sale_invoice": frm.doc.name }
      frappe.set_route("Form", "Daily Tour Transaction", "new-daily-tour-transaction-1")
    },);
  },
});