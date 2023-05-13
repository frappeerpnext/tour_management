// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Daily Tour Transaction', {
	refresh: function (frm) {
		if (frm.doc.docstatus == 1) {
			frm.add_custom_button(__('Convert To Sale Invice'), function () {
				frappe.route_options = { 
					"tour_transaction_number": frm.doc.name ,
					"posting_date":frm.doc.posting_date,
					"customer":frm.doc.agency,
					"items":[{
						"item_code":frm.doc.tour_destination
					}]
				}
				frappe.set_route("Form", "Sales Invoice", "new-sales-invoice-1")
			},);
		}
	},
	setup: function (frm) {
		if (!frm.doc.__islocal==1) {
			frm.set_df_property('posting_date', 'read_only', 1);
			frm.set_value('sale_invoice', '');
			
			frm.set_value('posting_date', frappe.datetime.nowdate());
			frm.set_value('dispatcher_date', frm.doc.posting_date);
		}else{
			frm.set_value('sale_invoice', '');
			frm.set_value('posting_date', frappe.datetime.nowdate());
			frm.set_value('edit_posting_date', true);
		}
		frm.set_query("tour_destination", function () {
			return {
				"filters": {
					"is_tour_package": true
				}
			};
		});
		frm.set_query("account", "guide_expenses", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account'
				}
			};
		});
		frm.set_query("guide", "guide_expenses", function () {
			return {
				"filters": {
					"type": 'Guide'
				}
			};
		});

	},
	edit_posting_date: function (frm) {
		frm.set_df_property('posting_date', 'read_only', !frm.doc.edit_posting_date);
	},
	arrival_date: function (frm) {
		if (frm.doc.dispatcher_date && frm.doc.arrival_date > frm.doc.dispatcher_date) {
			frappe.show_alert({
				message: "Arrival date cannot be after dispatcher date",
				indicator: "red"
			});
			return;
		}
		var arrival_date = new Date(frm.doc.arrival_date);
		var dispatcher_date = new Date(frm.doc.dispatcher_date);
		if (frm.doc.dispatcher_date) {
			var total_days = Math.floor((dispatcher_date - arrival_date) / (1000 * 60 * 60 * 24));
			frm.set_value('total_days', total_days + 1);
		}
	},
	dispatcher_date: function (frm) {
		
		if (frm.doc.arrival_date && frm.doc.arrival_date.length == 0) {
			if (frm.doc.arrival_date > frm.doc.dispatcher_date) {
				frappe.show_alert({
					message: "Dispatcher date cannot be before arrival date",
					indicator: "red"
				});
				return;
			}
		}
			var arrival_date = new Date(frm.doc.arrival_date);
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			
			if (frm.doc.dispatcher_date) {
				var total_days = Math.floor((dispatcher_date - arrival_date) / (1000 * 60 * 60 * 24));
				frm.set_value('total_days', total_days + 1);
			}
		
	},
	total_days: function (frm) {
		//if has both value
		if (frm.doc.arrival_date != '' && frm.doc.dispatcher_date != '') {
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			dispatcher_date.setDate(dispatcher_date.getDate() - frm.doc.total_days + 1);
			frm.doc.arrival_date = dispatcher_date.toISOString().substring(0, 10)
			frm.refresh_field('arrival_date');
			return
		}
		// is arrival date has value
		if (frm.doc.arrival_date && frm.doc.dispatcher_date == '') {
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			dispatcher_date.setDate(dispatcher_date.getDate() + frm.doc.total_days);
			frm.doc.dispatcher_date = dispatcher_date.toISOString().substring(0, 10)
			frm.refresh_field('dispatcher_date');
		}
		//if dispatcher date has value
		else if (frm.doc.dispatcher_date && frm.doc.arrival_date == '') {
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			dispatcher_date.setDate(dispatcher_date.getDate() - frm.doc.total_days);
			frm.set_value('arrival_date', dispatcher_date.toISOString().substring(0, 10));
		}
	},
	agency_share: function (frm) {
		frm.doc.total_agency_share = frm.doc.income_price * agency_share / 100;
		frm.refresh_field('total_agency_share');
	},
	tour_destination: function (frm) {
		frappe.db.get_value(
			"Item Price",
			{
				item_code: frm.selected_doc.tour_destination
			},
			"price_list_rate",
			(r) => {
				frm.set_value('rate', r.price_list_rate);
				frm.set_value('price_list_rate', r.price_list_rate);
				frm.set_value('base_price_list_rate', r.price_list_rate);
				var total_amount = 0;
				if (frm.doc.qty == "" || r.price_list_rate == "" || frm.doc.qty == null || r.price_list_rate == null) {
					total_amount = 0;
				}
				else {
					total_amount = frm.doc.qty * r.price_list_rate;
				}
				frm.set_value('total_amount', total_amount);
				frm.set_value('total_net_sale', frm.doc.net_sale * frm.doc.qty);
				frm.refresh_field();
			}
		);

		frappe.db.get_value(
			"Item",
			{
				item_code: frm.selected_doc.tour_destination
			},
			"expense_commission",
			(r) => {
				frm.set_value('sale_commission_rate', r.expense_commission);

			}
		);
	},
	qty: function (frm) {
		frappe.db.get_value(
			"Item Price",
			{
				item_code: frm.selected_doc.tour_destination
			},
			"price_list_rate",
			(r) => {
				frm.set_value('total_amount', frm.doc.qty * r.price_list_rate);
				// frm.set_value('income_amount', frm.doc.qty * frm.doc.income_price);
				frm.set_value('company_qty', frm.doc.qty);
				frm.set_value('sale_commission_qty', frm.doc.qty);
			}
		);
	},
	income_price: function (frm) {
		frm.set_value('income_amount', frm.doc.qty * frm.doc.income_price);
		frm.refresh_field();
	},
	company_qty: function (frm) {
		frm.set_value('company_total_amount', frm.doc.company_qty * frm.doc.company_rate);
		frm.refresh_field();
	},
	company_rate: function (frm) {
		frm.set_value('company_total_amount', frm.doc.company_qty * frm.doc.company_rate);
		frm.refresh_field();
	},
	sale_commission_rate: function (frm) {
		frm.set_value('sale_commission_total_amount', frm.doc.sale_commission_rate * frm.doc.sale_commission_qty);
		frm.refresh_field();
	},
	sale_commission_qty: function (frm) {
		frm.set_value('sale_commission_total_amount', frm.doc.sale_commission_rate * frm.doc.sale_commission_qty);
		frm.refresh_field();
	},
	total_commission_rate: function (frm) {
		frm.set_value('total_commission_total_amount', frm.doc.total_commission_rate * frm.doc.total_commission_qty);
		frm.refresh_field();
	},
	total_commission_qty: function (frm) {
		frm.set_value('total_commission_total_amount', frm.doc.total_commission_rate * frm.doc.total_commission_qty);
		frm.refresh_field();
	},
	share_to_company_income_share: function (frm) {
		frm.set_value('share_to_company_income_total_amount', frm.doc.share_to_company_income_share / 100 * frm.doc.total_commission_rate * frm.doc.total_commission_qty);
		frm.refresh_field();
	},

});



// frappe.ui.form.on('Tour Destination', {
// 	item_code:function(frm, cdt, cdn){
// 		let row = frappe.get_doc(cdt, cdn);
// 		frappe.db.get_value(
// 			"Item Price",
// 			{
// 				item_code: row.item_code
// 			},
// 			"price_list_rate",
// 			(r) => {
// 				frm.set_value('tour_destinations', row.idx, 'rate', 20)
// 				frm.doc.tour_destinations.forEach(function(row) {
// 					row.rate = r.price_list_rate;
// 					row.price_list_rate = r.price_list_rate;
// 					row.base_price_list_rate = r.price_list_rate;
// 					row.amount = row.qty * r.price_list_rate;
// 				});
// 				frm.refresh_field('tour_destinations');
// 			}
// 		);
// 	},
// 	qty:function(frm,cdt, cdn){
// 		let current_value =frappe.get_doc(cdt, cdn);
// 		frm.doc.tour_destinations.forEach(function(row) {
// 			row.amount = current_value.qty * current_value.rate;
// 		});
// 		frm.refresh_field('tour_destinations');
// 	},
// 	rate:function(frm,cdt, cdn){
// 		let current_value =frappe.get_doc(cdt, cdn);
// 		frm.doc.tour_destinations.forEach(function(row) {
// 			row.amount = current_value.qty * current_value.rate;
// 		});
// 		frm.refresh_field('tour_destinations');
// 	}
// })