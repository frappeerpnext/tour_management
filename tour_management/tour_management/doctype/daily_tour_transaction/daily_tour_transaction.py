# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from erpnext.accounts.general_ledger import (
	make_gl_entries,
	set_as_cancel
)
from erpnext.controllers.accounts_controller import AccountsController
class DailyTourTransaction(AccountsController):

	def validate(self):
		for guide_commission in self.guide_commissions:
			guide_commission.total_amount = guide_commission.share_percent / 100 * self.total_commission_total_amount
		for driver_commission in self.driver_commissions:
			driver_commission.total_amount = driver_commission.share_percent / 100 * self.total_commission_total_amount
		self.share_to_company_income_total_amount
		self.total_net_sale = self.net_sale * self.qty
		self.cost_center = frappe.get_cached_value("Company", self.company, "cost_center")

			

	def before_save(self):
		company_abbr = frappe.get_cached_value("Company", self.company, "abbr")
		self.commission_income_account = 'Commission Income' + ' - ' + company_abbr 

	def on_submit(self):
		if not self.guide_commissions:
			frappe.throw(_("Please add guide commission."))
		if not self.driver_commissions:
			frappe.throw(_("Please add driver commission."))
		if not self.income_account:
			frappe.throw(_("Please select Account Receivable"))
		self.make_gl_entries()

	def before_cancel(self):
		#cancel Receiveable
		set_as_cancel(self.doctype, self.name)

	def make_gl_entries(self, gl_entries=None, from_repost=False):
		
		gl_entries = []
  
		value = frappe.get_cached_value("Company", self.company,["default_payable_account","default_income_account"] )
		gl_entries=[]
		gl_entries.append(
      		self.get_gl_dict(
			{
				"voucher_no":self.name,
				"voucher_type":self.doctype,
				"account": value[1], 
				"party_type": "Agency",
				"party": self.agency,
				"against": self.agency,
				"credit": self.total_amount,
				"credit_in_account_currency": self.total_amount,
				"cost_center": self.cost_center,
				"against_voucher":self.name,
				"against_voucher_type": self.doctype,
			}))
		#posting Assets Receiveable
		gl_entries.append(
			self.get_gl_dict(
			{
				"voucher_no":self.name,
				"voucher_type":self.doctype,
				"account": self.income_account,
				"party_type": "Agency",
				"party": self.agency,
				"against": self.agency,
				"debit": self.company_total_amount,
				"debit_in_account_currency":self.company_total_amount,
				"cost_center": self.cost_center,
				"against_voucher": self.name,
				"against_voucher_type":self.doctype,
			},
			'USD',
			item=self,
			)
		)

		#posting expense commission
		#guide commission #debit
		for guide in self.guide_commissions:
			gl_entries.append(
				self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,
						"account": guide.account,
						"party_type": "Tour Guide And Driver",
						"party": guide.guide,
						"against": guide.guide,
						"debit": guide.total_amount,
						"debit_in_account_currency":guide.total_amount,
						"cost_center": self.cost_center,
						"against_voucher": self.name,
						"against_voucher_type":self.doctype,
					},
					'USD',
					item=self,
				)
			)
		#driver commission
		for driver in self.driver_commissions:
			#debit
			gl_entries.append(
				self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,
						"account": driver.account,
						"party_type": "Tour Guide And Driver",
						"party": driver.driver,
						"against": driver.driver,
						"debit": driver.total_amount,
						"debit_in_account_currency":driver.total_amount,
						"cost_center": self.cost_center,
						"against_voucher": self.name,
						"against_voucher_type":self.doctype,
					},
					'USD',
					item=self,
				)
			)
			
		#posting Income To Commission Income
		gl_entries.append(
			self.get_gl_dict(
			{
				"voucher_no":self.name,
				"voucher_type":self.doctype,
				"account": self.commission_income_account,
				"against": self.name,
				"debit": self.share_to_company_income_total_amount,
				"debit_in_account_currency": self.share_to_company_income_total_amount,
				"cost_center": self.cost_center,
				"party":self.company,
				"party_type":'Company',
				"against_voucher":self.name,
				"against_voucher_type": self.doctype,
			}))
  
		# Posting guide expense to chart of account
		if self.guide_expense:
			#debit
			# for expense in self.guide_expense:
			total_expense= sum(c.expense_amount for c in self.guide_expense)
			default_creditor_account = frappe.get_cached_value("Company", self.company, "default_payable_account")
			gl_entries.append(
				self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,
						"account": self.guide_expense_account,
						"party_type": "Tour Guide And Driver",
						"debit":total_expense ,
						"debit_in_account_currency":total_expense,
						"cost_center": self.cost_center,
						"against_voucher": self.name,
						"against_voucher_type":self.doctype,
					},
					'USD',
					item=self,
				)
			)
			for expense in self.guide_expense:
			#posting payable credit
				gl_entries.append(
					self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,	
						"account": default_creditor_account,
						"party":expense.guide,
						"credit": expense.expense_amount,
						"credit_in_account_currency": expense.expense_amount,
						"cost_center": self.cost_center,
						"party":expense.guide,
						"party_type":'Tour Guide And Driver',
						"against_voucher":self.name,
						"against_voucher_type": self.doctype,
					}))
    
		# Posting guide expense to chart of account
		if self.driver_expense:
			#debit
			# for expense in self.guide_expense:
			total_driver_expense= sum(c.expense_amount for c in self.guide_expense)
			default_creditor_account = frappe.get_cached_value("Company", self.company, "default_payable_account")
			gl_entries.append(
				self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,
						"account": self.driver_expense_account,
						"party_type": "Tour Guide And Driver",
						"debit":total_driver_expense ,
						"debit_in_account_currency":total_driver_expense,
						"cost_center": self.cost_center,
						"against_voucher": self.name,
						"against_voucher_type":self.doctype,
					},
					'USD',
					item=self,
				)
			)
			for driver in self.driver_expense:
			#posting payable credit
				gl_entries.append(
					self.get_gl_dict(
					{
						"voucher_no":self.name,
						"voucher_type":self.doctype,	
						"account": default_creditor_account,
						"party":driver.driver,
						"credit": driver.expense_amount,
						"credit_in_account_currency": driver.expense_amount,
						"cost_center": self.cost_center,
						"party":driver.driver,
						"party_type":'Tour Guide And Driver',
						"against_voucher":self.name,
						"against_voucher_type": self.doctype,
					}))
    
		make_gl_entries(gl_entries, cancel=(self.docstatus == 2), update_outstanding="No")
  

@frappe.whitelist()
def get_tour_stat(name):
	guide_commissions=frappe.get_all("Guide Commission",filters={"parent":name},fields=["total_amount"])
	driver_commissions=frappe.get_all("Driver Commission",filters={"parent":name},fields=["total_amount"])
	total_amount, share_to_company_income_total_amount= frappe.db.get_value("Daily Tour Transaction",name,["total_amount","share_to_company_income_total_amount"])
	total_expense = sum(c.total_amount for c in guide_commissions) + sum(c.total_amount for c in driver_commissions)
	return {
		"total_expense":total_expense,
		"total_revenue":total_amount,
		"profit":total_amount - total_expense
	}
 
@frappe.whitelist()
def get_agency_voucher_code(agency):
	vouchers = frappe.get_all(
			"Agency Voucher Code",
			fields=["name"],
			filters={
				"agency": agency,
				"is_used": 0
			},
		)
	return vouchers

@frappe.whitelist()
def add_voucher(voucher,tour):
	frappe.db.set_value('Agency Voucher Code', voucher, {
		'is_used': 1,
	})
	frappe.db.set_value('Daily Tour Transaction', tour, {
		'voucher': voucher,

	})