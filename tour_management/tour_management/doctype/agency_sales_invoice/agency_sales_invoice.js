// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on('Agency Sales Invoice', {
	refresh: function(frm) {
		if(frm.doc.workflow_state === 'Paid'){
			frm.set_read_only(true)
		}
		frm.get_field('packages').grid.wrapper
            .find('.grid-add-row').addClass('hide');
		if(frm.doc.payments.length == 0){
			frm.add_child('payments', {
				payment_date: frm.doc.posting_date,
				mode_of_payment: '',
				payment_amount:0,
				agency:frm.doc.agency
			})
			
			frm.refresh_field('payments');
		}
		

		frm.get_field('payments').grid.wrapper
		.find('.grid-add-row').addClass('hide');
		
		if(frm.is_new()){
			frm.set_value('posting_date',frappe.datetime.nowdate())
		}
	},
	
	get_sales_package:function(frm){
		if(!frm.doc.start_date){
			frappe.throw({
				message: __('Please select start date'),
				indicator: 'red'
			});
			
		}
		if(!frm.doc.end_date){
			frappe.throw({
				message: __('Please select end date'),
				indicator: 'red'
			});
		}
		if(!frm.doc.agency){
			frappe.throw({
				message: __('Please select agency'),
				indicator: 'red'
			});
		}
		frappe.call({
			method: "tour_management.tour_management.doctype.agency_sales_invoice.agency_sales_invoice.get_sold_tour_transaction",
			args:  {
				"agency": frm.doc.agency,
				"start_date": frm.doc.start_date,
				"end_date": frm.doc.end_date,
			},
			callback: function(data) {
				if(data.message){
					frappe.model.clear_table(frm.doc,'packages')
				}
				
				data.message.forEach((row)=>{
					frm.add_child('packages', {
						transaction_date: row.arrival_date,
						voucher_number: row.voucher,
						package_name:row.tour_destination_name,
						package:row.tour_destination,
						time:row.time,
						qty:row.company_qty,
						unit:'ea',
						unit_price:row.company_rate,
						package_reference:row.name,
						amount:row.company_rate * row.company_qty,
						remark:row.note
					})
				}),

				
				frm.refresh_field('packages');
			}
		});
	
	},
	
	include_vat:function(frm){
		if(frm.doc.include_vat===1){
			frm.set_value('vat_amount',frm.doc.vat_rate/100*frm.doc.gross_sale)
		}else{
			frm.set_value('vat_amount',0)
		}
		
	}

});


