// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Agency', {
	refresh: function (frm) {
		if (!frm.is_new()) {
			frm.dashboard.add_indicator(__('Receiveable: {0}',
				[format_currency(10)]), 'blue')
			frm.dashboard.add_indicator(__('Total paid: {0}',
				[format_currency(10)]), 'green')
			frm.dashboard.add_indicator(__('Remaining Balance: {0}',
				[format_currency(10)]), 'red')
		}

	}

});
