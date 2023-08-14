# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from py_linq import Enumerable
from erpnext.accounts.general_ledger import (
	make_gl_entries,
)
from erpnext.controllers.accounts_controller import AccountsController


class TourTicketBooking(AccountsController):
	def validate(self):
		for d in self.ticket_booking_item:
			d.total_amount = (d.price or 0 ) * (d.quantity or 1)

		self.total_quantity =   Enumerable(self.ticket_booking_item).sum(lambda x: (x.quantity or 0))
		self.total_amount =   Enumerable(self.ticket_booking_item).sum(lambda x: (x.total_amount or 0))
		self.total_pax = (self.adult or 0) + (self.child or 0)

		self.total_payment =   Enumerable(self.payments).sum(lambda x: (x.payment_amount or 0)) or 0
		self.balance = (self.total_amount or 0) - (self.total_payment or 0)-(self.total_discount or 0)
		
		if(self.discount_type == "Percent"):
			self.total_discount = (self.total_amount or 0) * (self.discount or 0) / 100
		else:
			self.total_discount = (self.discount or 0)
		self.set_payment_account()

	def on_submit(self):
		if not self.payments:
			frappe.throw(_("Please enter payment amount"))
		if self.total_discount > 0 and not self.discount_account:
			frappe.throw(_("Please select discount account"))
		self.validate_payment_amount()
		
		self.make_gl_entries()
		

	def validate_payment_amount(self):
		if (self.total_amount - self.total_discount) != self.total_payment:
			frappe.throw(_("Invalid Payment amount"))

	def make_gl_entries(self, gl_entries=None, from_repost=False):

		gl_entries=[]
		#Increase Recenue
		gl_entries.append(
      		self.get_gl_dict(
			{
				"account": self.income_account, 
				"party_type": "Customer",
				"party": self.guest_profile,
				"against": self.guest_profile,
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
						"account": self.discount_account,
						"party_type": "Customer",
						"party": self.guest_profile,
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
							"account": p.account,
							"party_type": "Customer",
							"party": self.guest_profile,
							"against": self.guest_profile,
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

	def set_payment_account(self):
		if not self.company:
			frappe.throw(_("Please select company"))
		
			

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