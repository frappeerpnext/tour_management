frappe.listview_settings['Agency Voucher Code']={
    add_fields: ['price','is_used'],
    get_indicator: function(doc) {
        console.log(doc)
		if (doc.is_used==1) {
            return [__("Used"), "green"];
        } else {
            return [__("Never Used"), "red"];
        }
		
	},
}