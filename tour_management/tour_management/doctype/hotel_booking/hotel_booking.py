# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt

import frappe
from py_linq import Enumerable
from erpnext.accounts.general_ledger import (
	make_gl_entries,
)
from erpnext.controllers.accounts_controller import AccountsController
from tour_management.utils import date_diff, get_room_rate

class HotelBooking(AccountsController):
	def validate(self):
		self.total_nights = date_diff(self.departure_date, self.arrival_date)
		#validate discount
		if(self.discount_type == "Percent"):
			self.discount_amount = (self.total_amount or 0) * (self.discount or 0) / 100
		else:
			self.discount_amount = (self.discount or 0)
		for d in self.room_types:
			d.number_of_room = (d.single_room or 0 ) + (d.double_room or 0) + (d.twin_room or 0)
			d.number_of_room = d.number_of_room or 1
			
			if d.rate == 0:
				d.rate = get_room_rate(self.hotel_name,d.room_type)

			d.total_amount = d.rate * d.number_of_room * self.total_nights

		self.total_rooms = Enumerable(self.room_types).sum(lambda x: (x.number_of_room or 0))
		self.total_room_night = self.total_rooms * self.total_nights
		self.total_amount = Enumerable(self.room_types).sum(lambda x:(x.total_amount or 0))
		self.total_payment = Enumerable(self.payments).sum(lambda x:(x.payment_amount or 0))
		self.balance = (self.total_amount or 0) - (self.discount_amount or 0) - (self.total_payment or 0)


	def on_submit(self):
		if not self.payments:
			frappe.throw("Please enter payment amount")
		if self.discount_amount > 0 and not self.discount_account:
			frappe.throw("Please select discount account")
		self.validate_payment_amount()
		self.make_gl_entries()

	def validate_payment_amount(self):
		if (self.total_amount - self.discount_amount) != self.total_payment:
			frappe.throw("Invalid Payment amount")

	def make_gl_entries(self, gl_entries=None, from_repost=False):
		
		value = frappe.get_cached_value("Company", self.company,["default_payable_account","default_income_account"] )
		gl_entries=[]

		#Increase Revenue
		gl_entries.append(
			self.get_gl_dict(
			{
				"voucher_no":self.name,
				"voucher_type":self.doctype,
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
		if self.discount_amount > 0:
			gl_entries.append(
				self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,
						"account": self.discount_account,
						"party_type": "Customer",
						"party": self.guest_profile,
						"against": self.name,
						"debit": self.discount_amount,
						"debit_in_account_currency":self.discount_amount,
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

@frappe.whitelist()
def get_rate(hotel_name, room_type):
	return get_room_rate(hotel_name,room_type)