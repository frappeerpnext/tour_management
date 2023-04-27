from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in tour_management/__init__.py
from tour_management import __version__ as version

setup(
	name="tour_management",
	version=version,
	description="Tour Management",
	author="SH",
	author_email="tour@est.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
