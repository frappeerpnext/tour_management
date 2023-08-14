# Copyright (c) 2023, SH and contributors
# For license information, please see license.txt
import frappe
from frappe import _
from datetime import date
from frappe.model.document import Document
from erpnext.accounts.general_ledger import (
    make_gl_entries,
    make_reverse_gl_entries,
    set_as_cancel,
)
from frappe.utils import markdown
from erpnext.controllers.accounts_controller import AccountsController


class AgencySalesInvoice(AccountsController):
    def validate(self):
        if (
            not self.payments
            and sum(c.payment_amount for c in self.payments) == self.total_amount
        ):
            frappe.throw(_("Please add payment"))
        self.gross_sale = sum(c.amount for c in self.packages)
        if self.include_vat == 1:
            self.vat_amount = self.vat_rate/100 * self.gross_sale
        self.paid_amount = (
            sum(c.payment_amount for c in self.payments)
            if len(self.payments) > 0
            else 0
        )
        self.total_amount = (
            float(self.gross_sale) + float(self.vat_amount if self.vat_amount else 0)
            if self.include_vat == 1
            else float(self.gross_sale)
        )
        
        filters = {
            "arrival_date": ["between", [self.start_date, self.end_date]],
            "agency": ["=", self.agency],
            "voucher": ["!=", ""],
        }
        self.total_vouchers = frappe.db.count("Daily Tour Transaction", filters)
        update_paid_amount_to_tour_package(self)

    def before_cancel(self):
        self.make_gl_entries()

    def on_submit(self):
        update_paid_amount_to_tour_package(self)
        self.make_gl_entries()

    def make_gl_entries(self, gl_entries=None, from_repost=False):
        gl_entries = []
        for p in self.packages:
            if p.paid_amount > 0:
                frappe.db.set_value(
                    "Daily Tour Transaction",
                    p.package_reference,
                    {
                        "company_paid_amount": p.paid_amount,
                        "paid_reference": self.name,
                    },
                )
            transaction = frappe.db.get_value(
                "Daily Tour Transaction",
                p.package_reference,
                ["company", "income_account", "agency"],
                as_dict=1,
            )
            default_account = frappe.get_all(
                "Mode of Payment Account",
                filters={"parent": self.payments[0].mode_of_payment},
                fields=["default_account"],
            )
            
            # posting Increase Cash or Bank
        gl_entries.append(
            self.get_gl_dict(
                {
                    "account": default_account[0]["default_account"],
                    "party_type": "Agency",
                    "party": self.agency,
                    "against": self.agency,
                    "debit": self.paid_amount,
                    "debit_in_account_currency": self.paid_amount,
                    "cost_center": self.cost_center,
                    "against_voucher_type": "Agency Sales Invoice",
                    "against_voucher": self.name,
                    "voucher_type": "Agency Sales Invoice",
                    "voucher_no": self.name,
                },
                "USD",
                item=self,
            )
        )
        # Decrease Receivable
        gl_entries.append(
            self.get_gl_dict(
                {
                    "account": transaction.income_account,
                    "party_type": "Agency",
                    "party": self.agency,
                    "against": self.agency,
                    "credit": self.paid_amount,
                    "credit_in_account_currency": self.paid_amount,
                    "cost_center": self.cost_center,
                    "against_voucher": self.name,
                    "against_voucher_type": self.doctype,
                    "voucher_type":'Agency Sales Invoice',
                    "voucher_no":self.name,
                },
                "USD",
                item=self,
            )
        )
        make_gl_entries(gl_entries, cancel=(self.docstatus == 2), update_outstanding="No")



def update_paid_amount_to_tour_package(self):
        total_paid = self.paid_amount
        for p in self.packages:
            if total_paid >= p.amount:
                p.paid_amount = p.amount
                total_paid = total_paid - p.amount
            else:
                p.paid_amount = total_paid
                total_paid = 0
                break

 
@frappe.whitelist()
def get_sold_tour_transaction(agency, start_date, end_date):
    tours = frappe.db.get_list(
        "Daily Tour Transaction",
        filters=[
            ["arrival_date", "between", [start_date, end_date]],
            ["agency", "=", agency],
            ["docstatus", "=", 1],
            ["company_paid_amount", "=", 0],
        ],
        fields=[
            "arrival_date",
            "voucher",
            "time",
            "company_rate",
            "company_qty",
            "company_total_amount",
            "tour_destination_name",
            "tour_destination",
            "name",
            "company_note"
        ],
        order_by="arrival_date",
        page_length=100,
    )
    return tours


def get_default_cost_center(company):
    try:
        # Fetch the company document
        company_doc = frappe.get_doc("Company", company)

        # Access the default cost center field
        default_cost_center = company_doc.cost_center

        return default_cost_center
    except Exception as e:
        return None
