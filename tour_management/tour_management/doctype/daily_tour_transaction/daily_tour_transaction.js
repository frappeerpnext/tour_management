// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Daily Tour Transaction', {
	refresh: function (frm) {
		
		if (!frm.is_new()) {
			frm.add_custom_button('Add Voucher', () => {
				frappe.call({
					method: "tour_management.tour_management.doctype.daily_tour_transaction.daily_tour_transaction.get_agency_voucher_code",
					args: {
						agency: frm.doc.agency,
					  },
					callback: function(r) {
						var d = new frappe.ui.Dialog({
							title: __('Add Voucher'),
							'fields': [
								{
									'fieldname': 'add_voucher',
									'fieldtype': 'Autocomplete',
									'label':'Voucher',
									'reqd':1,
									'options':r.message.map(obj => obj.name)
								}
							],
							primary_action: function(){
								let data = d.get_values();
								frappe.call({
									method:"tour_management.tour_management.doctype.daily_tour_transaction.daily_tour_transaction.add_voucher",
									args:{
										voucher:data.add_voucher,
										tour:frm.doc.name
									}
								});
								d.hide();
							},
						});
						d.show();
					},
				});
				
				frm.set_query('add_voucher', function() {
					return {
						'filters': {
							"agency": frm.doc.agency,
							"is_used":"0"
						}
					};
				});
				
				
			});
			

			frappe.call({
				type: "GET",
				method: "tour_management.tour_management.doctype.daily_tour_transaction.daily_tour_transaction.get_tour_stat",
				args: { "name": frm.doc.name },
				callback: function (r) {
					frm.dashboard.add_indicator(__('Total Revenue: {0}', [format_currency(r.message.total_revenue)]), 'green')
					frm.dashboard.add_indicator(__('Total Expense: {0}', [format_currency(r.message.total_expense)]), 'red')
					frm.dashboard.add_indicator(__('Total Profit: {0}', [format_currency(r.message.profit)]), 'blue')
				}
			})

		}
	},
	setup: function (frm) {
		
		if (!frm.doc.__islocal == 1) {
			frm.set_df_property('posting_date', 'read_only', 1);

		} else {
			
			frm.set_value('posting_date', frappe.datetime.nowdate());
			frm.set_value('edit_posting_date', true);
		}

		frm.set_query("share_to_company_account", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account',
					"company": frm.doc.company,
					"is_group":0
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
		frm.set_query("income_account", function () {
			return {
				"filters": {
					"account_type": "Receivable",
					"company": frm.doc.company,
					"is_group":0

				}
			};
		});

		
		frm.set_query("account", "guide_commissions", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account',
					"company": frm.doc.company

				}
			};
		});
		frm.set_query("account", "driver_commissions", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account',
					"company": frm.doc.company
				}
			};
		});
		frm.set_query("tour_destination", function () {
			return {
				"filters": {
					"is_tour_package": true
				}
			};
		});
		
		frm.set_query("guide_expense_account", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account',
					"is_group":0
				}
			};
		});
		frm.set_query("driver_expense_account", function () {
			return {
				"filters": {
					"account_type": 'Expenses Account',
					"is_group":0
				}
			};
		});

		frm.set_query("driver", "driver_expense", function () {
			return {
				"filters": {
					"type": 'Driver'
				}
			};
		});
		frm.set_query("guide", "guide_expense", function () {
			return {
				"filters": {
					"type": 'Guide'
				}
			};
		});
		
		frm.set_query("driver", "driver_commissions", function () {
			return {
				"filters": {
					"type": 'Driver'
				}
			};
		});
		frm.set_query("guide", "guide_commissions", function () {
			return {
				"filters": {
					"type": 'Guide'
				}
			};
		});
	},
	include_payment: function (frm) {
		console.log(frm.doc.include_payment);
		if (frm.doc.include_payment === 1) {
			frm.set_df_property('income_account', 'hidden', 1)
			frm.set_df_property('mode_of_payment', 'hidden', 0)
			frm.doc.income_account=""
		} else {
			frm.set_df_property('income_account', 'hidden', 0)
			frm.set_df_property('mode_of_payment', 'hidden', 1)
			frm.doc.mode_of_payment=""
		}
		frm.refresh()
	},
	company: function (frm) {
		frm.refresh()
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
	rate:function(frm){
		frm.doc.total_amount = frm.doc.rate *  frm.doc.qty
		frm.refresh_field('total_amount')
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
				frm.set_value('company_qty', frm.doc.qty);
				frm.set_value('sale_commission_qty', frm.doc.qty);
				frm.set_value('total_commission_qty', frm.doc.qty);
			}
		);
	},
	income_price: function (frm) {
		frm.set_value('income_amount', frm.doc.qty * frm.doc.income_price);

	},
	company_qty: function (frm) {
		frm.set_value('company_total_amount', frm.doc.company_qty * frm.doc.company_rate);

	},
	company_rate: function (frm) {
		frm.set_value('company_total_amount', frm.doc.company_qty * frm.doc.company_rate);

	},
	sale_commission_rate: function (frm) {
		frm.set_value('sale_commission_total_amount', frm.doc.sale_commission_rate * frm.doc.sale_commission_qty);

	},
	sale_commission_qty: function (frm) {
		frm.set_value('sale_commission_total_amount', frm.doc.sale_commission_rate * frm.doc.sale_commission_qty);

	},
	total_commission_rate: function (frm) {
		frm.set_value('total_commission_total_amount', frm.doc.total_commission_rate * frm.doc.total_commission_qty);
	},
	total_commission_qty: function (frm) {
		frm.set_value('total_commission_total_amount', frm.doc.total_commission_rate * frm.doc.total_commission_qty);
	},
	share_to_company_income_share: function (frm) {
		frm.set_value('share_to_company_income_total_amount', frm.doc.share_to_company_income_share / 100 * frm.doc.total_commission_rate * frm.doc.total_commission_qty);
	},
	share_to_company_income_name:function(frm){
		frm.set_value('share_to_company_income_total_amount', frm.doc.share_to_company_income_share / 100 * frm.doc.total_commission_rate * frm.doc.total_commission_qty);
	}


});

frappe.ui.form.on('Guide Expenses', {
	refresh: function (frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, 'status', 'Confirmed');


	}
});

