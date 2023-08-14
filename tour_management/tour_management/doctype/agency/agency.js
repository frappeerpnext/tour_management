// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Agency', {
	refresh: function (frm) {
		if (!frm.is_new()) {
			frappe.call({
				type: "GET",
				method: "tour_management.tour_management.doctype.agency.agency.get_agency_balance",
				args: { "name": frm.doc.name },
				callback: function (r) {
					console.log(r.message)
					frm.dashboard.add_indicator(__('Receiveable: {0}',
						[format_currency(r.message.total_receiveable)]), 'blue')
				}
			})

		}


	}

});
