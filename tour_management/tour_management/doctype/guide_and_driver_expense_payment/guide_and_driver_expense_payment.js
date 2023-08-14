// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Guide and Driver Expense Payment', {
	refresh: function(frm) {
		frm.set_query("party", function () {
			return {
				"filters": {
					"type": frm.doc.type
				}
			};
		});
		frm.set_query("cost_center", function () {
			return {
				"filters": {
					"company": frm.doc.company
				}
			};
		});
		frm.set_query("expense_account", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account',
					"company": frm.doc.company
				}
			};
		});
		frm.set_query("mode_of_payment", function () {
			return {
				"filters": {
					"company": frm.doc.company
				}
			};
		});

		frm.get_field('packages').grid.wrapper
            .find('.grid-add-row').addClass('hide');
	},
	type:function(frm){
		frm.set_query("party", function () {
			frm.doc.mode_of_payment = ''
			frm.doc.payment_date = ''
			frm.doc.payment_amount=0
			return {
				"filters": {
					"type": frm.doc.type
				}
			};
		});
	},
	get_destination:function(frm){
		if (!frm.doc.party || !frm.doc.start_date || !frm.doc.end_date){
			frappe.throw('Please ensure you have selected Party, Start and End Date')
		}
		
		frappe.call({
			method: "tour_management.tour_management.doctype.guide_and_driver_expense_payment.guide_and_driver_expense_payment.get_expense_tour",
			args:  {
				"party_type":frm.doc.type,
				"party": frm.doc.party,
				"start_date": frm.doc.start_date,
				"end_date": frm.doc.end_date,
			},
			callback: function(data) {
				if(data.message){
					frappe.model.clear_table(frm.doc,'packages')
				}
				let payment_amount = 0;
				data.message.forEach((row)=>{
					payment_amount = payment_amount + row.total_amount
					
					frm.add_child('packages', {
						package:row.tour_destination,
						tour_transaction:row.name,
						expense_type:row.expense_type,
						total_amount:row.total_amount,
						date:row.date,
						account:row.account
					})
				}),
				frm.set_value('paid_amount',payment_amount);
				frm.refresh_field('packages');
				
			}
		});
	}
});
