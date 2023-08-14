from frappe import _


def get_data():
	return {
		"heatmap": True,
		"fieldname": "guide",
		'transactions': [
            {
                'label': _('Tour Transaction'),
                'items': ['Daily Tour Transaction']
            }
        ]
		
	}
