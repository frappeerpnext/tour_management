// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on("Tour Ticket Booking", {
    setup(frm){
        frm.set_query("income_account", function () {
			return {
				"filters": {
					"account_type": 'Income Account',
					"company": frm.doc.company
				}
			};
		});

        frm.set_query("cost_center", function () {
			return {
				"filters": {
					"company": frm.doc.company,
                    "is_group":0
				}
			};
		});
        frm.set_query("payment_type", "payments", function () {
			return {
				"filters": {
					//"account_type": 'Expenses Account',
					"company": frm.doc.company
				}
			};
		});
        // get default 
        if(frm.is_new()){
            frappe.call({
                method: "tour_management.tour_management.doctype.tour_ticket_booking.tour_ticket_booking.get_default_value",
                args: {
                    company: frm.doc.company,
                },
                callback: function(r) {
                    if(!r.exc) {
                        frm.set_value("cost_center", r.message.cost_center);
                        frm.set_value("income_account", r.message.default_income_account);
                    }
                }
            });
        }
        
    },
	refresh(frm) {
        if(!frm.doc.__islocal){ 
 
            frm.dashboard.add_indicator(__("Total Amount: {0}",[format_currency(frm.doc.total_amount)]) ,"blue");
            frm.dashboard.add_indicator(__("Total Paid: {0}",[format_currency(frm.doc.total_payment)]) ,"green");
            frm.dashboard.add_indicator(__("Balance: {0}",[format_currency(frm.doc.balance)]) ,"orange");
        }
        
	},
    ticket_type(frm){
        
        frm.set_query("ticket_code","ticket_booking_item", function() {
            return {
                filters: [
                    ["Ticket","ticket_category", "=", frm.doc.ticket_type]
                ]
            }
        });
    },
    total_discount(frm){
        updateDiscount(frm);
    },
    discount_type(frm){
        updateDiscount(frm); 
    },
    discount(frm){
        updateDiscount(frm); 
    },
    adult(frm){
        totalPax(frm);
    },
    child(frm){
        totalPax(frm);
    },
    total_payment(frm){
        if(frm.doc.total_payment && frm.doc.total_amount){
            frm.doc.balance = (frm.doc.total_amount || 0) - (frm.doc.total_payment || 0);
            frm.refresh_field('balance')
        }
    },
    total_amount(frm){
        if(frm.doc.total_payment && frm.doc.total_amount){
            frm.doc.balance = (frm.doc.total_amount || 0) - (frm.doc.total_payment || 0);
            frm.refresh_field('balance')
        }
    },
});

frappe.ui.form.on('Tour Booking Payments', {
    payment_amount(frm,cdt, cdn) {
       
       const payments = frm.doc.payments
       frm.set_value('total_payment', payments.reduce((n, d) => n + d.payment_amount,0));
       frm.refresh_field('total_payment'); 
    },
    payments_remove:function(frm){
        frm.set_value('total_payment', frm.doc.payments.reduce((n, d) => n + (d.payment_amount || 0),0));
        frm.refresh_field('total_payment'); 
    },
    payment_type(frm,cdt, cdn){
        
        frappe.call({
            method: "tour_management.tour_management.doctype.tour_ticket_booking.tour_ticket_booking.get_payment_account",
            args: {
                company: frm.doc.company,
                mode_of_payment: locals[cdt][cdn]["payment_type"],
            },
            callback: function(r) {
                console.log(locals[cdt][cdn] )
                if(!r.exc) {
                    locals[cdt][cdn]["account"] = r.message.default_account;
                    // frm.set_value("income_account", r.message.default_income_account);
                
                    
                    console.log(r.message)
                    console.log(locals[cdt][cdn]["account"])
                }
            }
        });
    }
});
frappe.ui.form.on('Ticket Booking Item', {
    quantity:function (frm,cdt, cdn) {
     let doc = locals[cdt][cdn];
     if (doc.quantity && doc.price){
         doc.total_amount = (doc.quantity || 0) * (doc.price || 0)
         refresh_field('ticket_booking_item');
     }
     const ticket_booking_item = frm.doc.ticket_booking_item;
     frm.set_value('total_amount', ticket_booking_item.reduce((n,d) => n + d.total_amount, 0));
     frm.refresh_field('total_amount');
   },
   price:function (frm,cdt, cdn) {
     let doc = locals[cdt][cdn];
     if (doc.quantity && doc.price){
         doc.total_amount = (doc.quantity || 0) * (doc.price || 0)
         refresh_field('ticket_booking_item');
     }
     const ticket_booking_item = frm.doc.ticket_booking_item;
     frm.set_value('total_amount', ticket_booking_item.reduce((n,d) => n + d.total_amount, 0));
     frm.refresh_field('total_amount');
   },
 });

function updateDiscount(frm){
    if (frm.doc.discount_type=="Percent" && frm.doc.discount){
        frm.doc.total_discount = (frm.doc.total_amount || 0) * (frm.doc.discount || 0)/100;
        frm.doc.balance = (frm.doc.total_amount || 0) - (frm.doc.total_payment || 0) - (frm.doc.total_discount || 0);  
    }
    else{
        frm.doc.total_discount = (frm.doc.discount||0)
        frm.doc.balance = (frm.doc.total_amount || 0) - (frm.doc.total_payment || 0) - (frm.doc.total_discount || 0);
    }
    frm.refresh_field('total_discount')
    frm.refresh_field('balance')
}
function totalPax(frm){
    if(frm.doc.adult && frm.doc.child){
        frm.doc.total_pax = (frm.doc.adult || 0) + (frm.doc.child || 0)
        frm.refresh_field('total_pax');
    }
}
