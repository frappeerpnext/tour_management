// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Daily Tour Transaction', {
	refresh: function(frm) {
		frm.set_value('posting_date', frappe.datetime.nowdate());
		frm.set_value('dispatcher_date', frm.doc.posting_date);
		frm.set_df_property('posting_date', 'read_only', 1);
		if(frm.doc.sale_invoice){
			frappe.db.get_doc('Sales Invoice', frm.doc.sale_invoice,{fields: ['posting_date', 'items']}).then(doc => {
				frm.set_value('agency',doc.customer)
				frm.set_value('agency_name',doc.customer_name)
			});
		}
		
	},
	setup: function (frm) {
		frm.set_query("tour_destination", function () {
			return {
				"filters": {
					"is_tour_package": true
				}
			};
		});

	},
	edit_posting_date:function(frm){
		frm.set_df_property('posting_date', 'read_only', frm.doc.edit_posting_date);
	},
	arrival_date:function(frm){
		if(frm.doc.dispatcher_date && frm.doc.arrival_date > frm.doc.dispatcher_date){
			frappe.show_alert({
				message: "Arrival date cannot be after dispatcher date",
				indicator: "red"
			});
			return;
		}
		var arrival_date = new Date(frm.doc.arrival_date);
		var dispatcher_date = new Date(frm.doc.dispatcher_date);
		if(frm.doc.dispatcher_date){
			var total_days = Math.floor((dispatcher_date - arrival_date) / (1000 * 60 * 60 * 24));
			frm.set_value('total_days', total_days + 1);
		}
	},
	dispatcher_date:function(frm){
		if(frm.doc.arrival_date && frm.doc.arrival_date.length == 0){
			console.log(!frm.doc.arrival_date)
			if(frm.doc.arrival_date > frm.doc.dispatcher_date){
				frappe.show_alert({
					message: "Dispatcher date cannot be before arrival date",
					indicator: "red"
				});
				return;
			}
			var arrival_date = new Date(frm.doc.arrival_date);
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			if(frm.doc.dispatcher_date){
				var total_days = Math.floor((dispatcher_date - arrival_date) / (1000 * 60 * 60 * 24));
				frm.set_value('total_days', total_days + 1);
			}
		}
		
	},
	total_days:function(frm){
		//if has both value
		if(frm.doc.arrival_date != '' && frm.doc.dispatcher_date != ''){
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			dispatcher_date.setDate(dispatcher_date.getDate() - frm.doc.total_days + 1);
			frm.doc.arrival_date = dispatcher_date.toISOString().substring(0, 10)
			frm.refresh_field('arrival_date');
			return
		}
		// is arrival date has value
		if(frm.doc.arrival_date && frm.doc.dispatcher_date == ''){
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			dispatcher_date.setDate(dispatcher_date.getDate() + frm.doc.total_days);
			frm.doc.dispatcher_date = dispatcher_date.toISOString().substring(0, 10)
			frm.refresh_field('dispatcher_date');
		}
		//if dispatcher date has value
		else if(frm.doc.dispatcher_date && frm.doc.arrival_date == ''){
			var dispatcher_date = new Date(frm.doc.dispatcher_date);
			dispatcher_date.setDate(dispatcher_date.getDate() - frm.doc.total_days);
			frm.set_value('arrival_date', dispatcher_date.toISOString().substring(0, 10));
			frm.refresh_field('arrival_date');
		}
	},
	agency_share:function(frm){
		frm.doc.total_agency_share = frm.doc.income_price * agency_share/100;
		frm.refresh_field('total_agency_share');
	},
	tour_destination:function(frm){
		console.log(frm)
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
				frm.set_value('total_amount', frm.doc.qty * r.price_list_rate);
				frm.set_value('income_qty', frm.doc.qty);
				frm.set_value('total_net_sale', frm.doc.net_sale * frm.doc.qty);
				frm.refresh_field();
			}
		);
	},
	qty:function(frm){
		frappe.db.get_value(
			"Item Price",
			{
				item_code: frm.selected_doc.tour_destination
			},
			"price_list_rate",
			(r) => {
				frm.set_value('total_amount', frm.doc.qty * r.price_list_rate);
				frm.set_value('income_qty', frm.doc.qty);
				frm.set_value('income_amount', frm.doc.qty * frm.doc.income_price);
				frm.refresh_field();
			}
		);
	},
	income_price:function(frm){
		frm.set_value('income_amount', frm.doc.qty * frm.doc.income_price);
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