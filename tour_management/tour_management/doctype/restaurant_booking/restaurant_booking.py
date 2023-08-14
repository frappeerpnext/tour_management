# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt

import frappe
from py_linq import Enumerable
from frappe.utils.print_format import download_pdf
import pdfkit
from erpnext.accounts.general_ledger import (
	make_gl_entries,
)
from erpnext.controllers.accounts_controller import AccountsController
from frappe.utils import format_date

class RestaurantBooking(AccountsController):
	def validate(self):
		if(self.discount_type == "Percent"):
			self.total_discount = (self.total_amount or 0) * (self.discount or 0) / 100
		else:
			self.total_discount = (self.discount or 0)
		self.balance = (self.total_amount or 0) - (self.total_payment or 0) - (self.total_discount or 0)

	def on_submit(self):
		if not self.payments:
			frappe.throw("Please enter payment amount")
		if self.total_discount > 0 and not self.discount_account:
			frappe.throw("Please select discount account")
		self.validate_payment_amount()
		self.make_gl_entries()
		# send_emails(self)
		# frappe.enqueue('tour_management.tour_management.doctype.restaurant_booking.restaurant_booking.send_emails',self=self)

	# def before_save(self):
		# frappe.enqueue('tour_management.tour_management.doctype.restaurant_booking.restaurant_booking.send_emails',self=self)
		# send_emails(self)

	def make_gl_entries(self, gl_entries=None, from_repost=False):
		
		value = frappe.get_cached_value("Company", self.company,["default_payable_account","default_income_account"] )
		gl_entries=[]

		#Increase Recenue
		gl_entries.append(
      		self.get_gl_dict(
			{
       
       "voucher_no":self.name,
							"voucher_type":self.doctype,
				"account": self.income_account, 
				"party_type": "Customer",
				"party": self.guest_name,
				"against": self.guest_name,
				"credit": self.total_amount,
				"credit_in_account_currency": self.total_amount,
				"cost_center": self.cost_center,
				"against_voucher":self.name,
				"against_voucher_type": self.doctype,
			}))

		#posting discount to chart account if exsist discount
		if self.total_discount > 0:
			gl_entries.append(
				self.get_gl_dict(
					{
         "voucher_no":self.name,
							"voucher_type":self.doctype,
						"account": self.discount_account,
						"party_type": "Customer",
						"party": self.guest_name,
						"against": self.name,
						"debit": self.total_discount,
						"debit_in_account_currency":self.total_discount,
						"cost_center": self.cost_center,
						"against_voucher": self.name,
						"against_voucher_type":self.doctype,
					},
					'USD',
					item=self,
				)
			)
		#Increase asset Payment on Hand

		if self.payments:
			for p in self.payments:
				gl_entries.append(
					self.get_gl_dict(
						{
          "voucher_no":self.name,
							"voucher_type":self.doctype,
							"account": p.account,
							"party_type": "Customer",
							"party": self.guest_name,
							"against": self.guest_name,
							"debit": p.payment_amount,
							"debit_in_account_currency":p.payment_amount,
							"cost_center": self.cost_center,
							"against_voucher": self.name,
							"against_voucher_type":self.doctype,
						},
						'USD',
						item=self,
					)
				)
		

		make_gl_entries(gl_entries, cancel=(self.docstatus == 2), update_outstanding="No")

	def validate_payment_amount(self):
		if (self.total_amount - self.total_discount) != self.total_payment:
			frappe.throw(_("Invalid Payment amount"))


@frappe.whitelist()
def get_meal_plan_rate(restaurant_name, meal_plan):
	data = frappe.db.sql("select coalesce(max(adult_price),0) as adult_price,coalesce(max(child_price),0) as child_price from `tabRestaurant Meal Plan` where parent = '{}' and meal_plan='{}'".format(restaurant_name,meal_plan), as_dict = 1)
	return data

@frappe.whitelist()
def get_default_value(company):
    values = frappe.get_value("Company",{'name': company},['cost_center','default_income_account'],as_dict=1)
    return values

@frappe.whitelist()
def get_payment_account(mode_of_payment,company):
	payment_type = frappe.get_all("Mode of Payment Account", 
	filters = dict(parent=mode_of_payment,company=company),fields="default_account")
	if payment_type:
		payment_type=payment_type[0]
	else: payment_type=frappe.get_cached_value("Company", company, "default_cash_account")
	return payment_type


# def send_emails(self):
# 	subject = """New Restaurant Booking {}""".format(self.name)
# 	content = """A Restaurant Booking {0} has been confirmed by {1} in restaurant {2} with Total Amount {3}""".format(self.name,self.owner,self.restaurant,frappe.format_value(self.total_amount, dict(fieldtype='Currency')))
# 	html_content = frappe.get_print(doctype=self.doctype,name=self.name, print_format=self.print_format,as_pdf=True)
# 	frappe.sendmail(
# 		recipients=['sengho715@gmail.com','kimhimley07@gmail.com'],
# 		args={"doc": self},
# 		reference_doctype=self.doctype,
# 		reference_name=self.name,
# 		name=self.name,
# 		delayed=False,
# 		subject = subject,
# 		content=content,
# 		attachments=[{
#             "fname": """{0}_{1}.pdf""".format(self.name,format_date(self.posting_date, "dd-mm-yyyy")),  # Set the desired filename for the attachment
#             "fcontent": html_content
#         }],
# 	)

