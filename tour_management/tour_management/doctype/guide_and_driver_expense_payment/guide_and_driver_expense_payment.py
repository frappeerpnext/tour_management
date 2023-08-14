# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from erpnext.accounts.general_ledger import set_as_cancel
from erpnext.controllers.accounts_controller import AccountsController
from erpnext.accounts.general_ledger import (
    make_gl_entries,
    make_reverse_gl_entries,
    set_as_cancel,
)

class GuideandDriverExpensePayment(AccountsController):
	def validate(self):
		
		if self.packages:
			self.total_amount = sum(c.total_amount for c in self.packages)
		self.update_paid_amount_to_tour_package();
		self.total_expense = sum(c.total_amount for c in self.packages)

	def on_cancel(self):
		self.make_gl_entries()
		

	def on_submit(self):
		self.make_gl_entries()
 
 
	def make_gl_entries(self, gl_entries=None, from_repost=False):
		if not self.payment_date or not self.mode_of_payment or not self.paid_amount:
			frappe.throw('Please enter payment info')
		#posting to GL Entry 
		default_account = frappe.get_all('Mode of Payment Account', filters={'parent': self.mode_of_payment}, fields=['default_account'])
		#update paid Status

		if not default_account:
			frappe.throw("Mode of payment {0} not exist in {1}".format(self.mode_of_payment,self.company))
		default_account = frappe.get_all(
			"Mode of Payment Account",
			filters={"parent": self.mode_of_payment},
			fields=["default_account"],
		)
		gl_entries = []
			# posting Decrease Cash or Bank
		gl_entries.append(
			self.get_gl_dict(
				{
					"account": default_account[0]["default_account"],
					"party_type": 'Tour Guide And Driver',
					"party": self.party,
					"credit": self.paid_amount,
					"credit_in_account_currency": self.paid_amount,
					"cost_center": self.cost_center,
					"against_voucher_type": 'Guide and Driver Expense Payment',
					"against_voucher": self.name,
					"voucher_type":self.doctype,
					"voucher_no":self.name,
					"account_currency":"USD",
				},
				"USD",
				item=self,
			)
		)

		for package in self.packages:
			# Decrease Expense
			
			gl_entries.append(
				self.get_gl_dict(
					{
						"account": package.account,
						"party": self.party,
						"party_type":'Tour Guide And Driver',
						"debit": package.paid_amount,
						"debit_in_account_currency": package.paid_amount,
						"cost_center": self.cost_center,
						"account_currency":"USD",
						"voucher_type":self.doctype,
						"voucher_no":self.name,
					},
					"USD",
					item=self,
				)
			)
		if self.docstatus == 1:
			make_gl_entries(gl_entries, cancel=(self.docstatus == 2), update_outstanding="No")
		elif self.docstatus == 2:
			make_reverse_gl_entries(voucher_no=self.name,voucher_type=self.docstatus)
		result = ','.join([str(p.tour_transaction) for p in self.packages])
		packages_name = "'" + result.replace(",", "','") + "'"
		sql="""Update `tab{0} Commission` set paid_amount = total_amount where parent in ({1}) """.format(self.type,packages_name)
		sql="""Update `tab{0} Expense` set paid_amount = total_amount where parent in ({1}) """.format(self.type,packages_name)
		frappe.db.sql(sql);
		

	def before_submit(self):
		if not self.mode_of_payment or not self.payment_date or not self.paid_amount:
			frappe.throw('Please select payment info.')
		if not self.packages:
			frappe.throw('Package not exist.')
 
 
	def update_paid_amount_to_tour_package(self):
		total_paid = self.paid_amount
		for p in self.packages:
			if total_paid >= p.total_amount:
				p.paid_amount = p.total_amount
				total_paid = total_paid - p.total_amount
			else:
				p.paid_amount = total_paid
				total_paid = 0
				break
 
@frappe.whitelist()
def get_expense_tour(party_type,party,start_date,end_date):
	
	table = ''
	table2 = ''
	if party_type == 'Guide':
		table = 'tabGuide Commission'
		table2 = 'tabGuide Expense'
	elif party_type == 'Driver':
		table = 'tabDriver Commission'
		table2 = 'tabDriver Expense'
	sql_commission = """
			select
				b.name,
				b.arrival_date date,
				b.tour_destination,
				b.tour_destination_name,
				a.commission_type expense_type,
				a.total_amount,
				a.account
	 		from `{0}` a
			inner join `tabDaily Tour Transaction` b 
				on a.parent = b.name
			where {1} = '{2}' and 
				b.arrival_date between '{3}' and '{4}'
		""".format(table,party_type.lower(),party,start_date,end_date)

	sql_expense = """
			SELECT 
			b.name, 
			b.arrival_date date, 
			b.tour_destination, 
			b.tour_destination_name, 
			a.expense_type expense_type, 
			a.expense_amount AS total_amount,
			b.guide_expense_account AS account
	 		from `{0}` a
			inner join `tabDaily Tour Transaction` b 
				on a.parent = b.name
			where {1} = '{2}' and 
				b.arrival_date between '{3}' and '{4}'
		""".format(table2,party_type.lower(),party,start_date,end_date)
	sql = sql_commission + " union " + sql_expense
	packages = frappe.db.sql(sql,as_dict=1)
	
	return packages

def get_default_cost_center(company):
	try:
		# Fetch the company document
		company_doc = frappe.get_doc("Company", company)

		# Access the default cost center field
		default_cost_center = company_doc.cost_center

		return default_cost_center
	except Exception as e:
		return None