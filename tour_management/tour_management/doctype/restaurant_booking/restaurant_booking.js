// Copyright (c) 2023, SH and contributors
// For license information, please see license.txt

frappe.ui.form.on("Restaurant Booking", {
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
        frm.set_query("print_format", function () {
			return {
				"filters": {
					"doc_type": frm.doc.doctype,
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
                method: "tour_management.tour_management.doctype.restaurant_booking.restaurant_booking.get_default_value",
                args: {
                    company: frm.doc.company,
                },
                callback: function(r) {
                    if(!r.exc) {
                        console.log(r)
                        frm.set_value("cost_center", r.message.cost_center);
                        frm.set_value("income_account", r.message.default_income_account);
                    }
                    console.log(r)
                }
            });
        }
	},
	refresh(frm) {
        set_indicator(frm);
	},
    restaurant_name(frm){   
        // $.each(frm.doc.room_types,  function(i, d)  {
        //     updateRoomTypeRow(frm,d)
        // });
    },
    discount_type(frm){
        updateDiscount(frm); 
    },
    discount(frm){
        updateDiscount(frm); 
        updateBalance(frm);
    },
    total_discount(frm){
        updateDiscount(frm); 
        updateBalance(frm);
    },
    total_amount(frm){
        updateBalance(frm);
    },
    total_payment(frm){
        updateBalance(frm);
    },

});


frappe.ui.form.on('Tour Booking Payments', {
 
    payment_amount:function (frm,cdt, cdn) {
        const payments=  frm.doc.payments;
        frm.set_value('total_payment', payments.reduce((n, d) => n + d.payment_amount,0));
        
    },
    payment_type(frm,cdt, cdn){
        
        frappe.call({
            method: "tour_management.tour_management.doctype.restaurant_booking.restaurant_booking.get_payment_account",
            args: {
                company: frm.doc.company,
                mode_of_payment: locals[cdt][cdn]["payment_type"],
            },
            callback: function(r) {
                console.log(locals[cdt][cdn] )
                if(!r.exc) {
                    locals[cdt][cdn]["account"] = r.message.default_account;
                }
            }
        });
    }
})

frappe.ui.form.on('Restaurant Booking Meal Plan', {
    meal_plan:function (frm,cdt, cdn) {
        let doc = locals[cdt][cdn];
        frm.call({
            method: 'get_meal_plan_rate',
            args:{
                restaurant_name:frm.doc.restaurant,
                meal_plan:doc.meal_plan,
            },
            callback:function(r){
                if(r.message){
                  
                   doc.adult_price = r.message[0].adult_price;
                   doc.child_price = r.message[0].child_price;
                  
                   
                   updateMealPlanSummary(frm,doc)
                }
                
            },
            async: true,
        });
         

    },
    adult:function (frm,cdt, cdn) {
       
        updateMealPlanSummary(frm, locals[cdt][cdn]);
    },
    child:function(frm,cdt,cdn){
        updateMealPlanSummary(frm, locals[cdt][cdn]);
    },
    
    adult_price:function(frm,cdt,cdn){
        updateMealPlanSummary(frm, locals[cdt][cdn]);
    },
    child_price:function(frm,cdt,cdn){
        updateMealPlanSummary(frm, locals[cdt][cdn]);
    }
     
})
function updateMealPlanSummary(frm,doc){
     
    const meal_plan =   frm.doc.meal_plan;
    const adult = meal_plan.reduce((n, d) => n + d.adult,0)
    const child= meal_plan.reduce((n, d) => n + d.child,0)
    const amount_adult  = meal_plan.reduce((n, d) => n + (d.adult || 1) * d.adult_price,0)
    const amount_child  = meal_plan.reduce((n, d) => n + (d.child || 1) * d.child_price,0)
    doc.total_amount = (doc.adult_price || 0 ) * (doc.adult || 1) + (doc.child_price || 0) * (doc.child || 0)

    frm.set_value('adult', adult);
    frm.set_value('child',child);
    frm.set_value('pax', (adult || 1) + (child || 0));
    frm.set_value('total_adult_amount', amount_adult);
    frm.set_value('total_child_amount', amount_child);
    frm.set_value('total_amount', amount_adult + amount_child);
    refresh_field('meal_plan');
}
function updateDiscount(frm){
    if (frm.doc.discount_type=="Percent" && frm.doc.discount){
        frm.doc.total_discount = (frm.doc.total_amount || 0) * (frm.doc.discount || 0)/100;  
        frm.refresh_field('total_discount')
    }
    else{
        frm.doc.total_discount = (frm.doc.discount||0)
        frm.refresh_field('total_discount')
    }
}
function updateBalance(frm){
    if(frm.doc.total_amount && frm.doc.total_payment && frm.doc.discount && frm.doc.total_discount){
        frm.doc.balance = (frm.doc.total_amount || 0) - (frm.doc.total_payment || 0) -(frm.doc.total_discount || 0)
        frm.refresh_field('balance')
    }
}
function set_indicator(frm){
    if(frm.doc.__islocal)
			return;
  
    frm.dashboard.add_indicator(__("Pax(A/C): {0}",[frm.doc.adult + " / " + frm.doc.child]) ,"blue");
    if (frm.doc.total_adult_amount>0 )  frm.dashboard.add_indicator(__("Amount Adult: {0}",[format_currency(frm.doc.total_adult_amount)]) ,"blue");
    if (frm.doc.total_child_amount>0 )  frm.dashboard.add_indicator(__("Amount Child: {0}",[format_currency(frm.doc.total_child_amount)]) ,"blue");
    if (frm.doc.total_payment>0 )  frm.dashboard.add_indicator(__("Total Paid: {0}",[format_currency(frm.doc.total_payment)]) ,"green");
    frm.dashboard.add_indicator(__("Balance: {0}",[format_currency(frm.doc.balance)]) ,"red");
 
 
}