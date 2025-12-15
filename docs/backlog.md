
* Create a script, callable with "npm create_user:prod". Creates a user in prod db with :email :password (cli args).
* Be able run prod as a frozen build (not using ".next" dir). 
* Setup nginx routing from domain (acclerk.se) to port (3000). Make sure everything works with next. Check "../infra/scripts" for how I've done on this vps for previous sites.
* Run prod as a service. Create an run_prod.sh. Should be runnable from systemctl service thing.
* About page. Not a protected route. Should be a big visible link in the /login page. So if a user doesn't have an account, can go here. Main thing on the about page, an embedded youtube video.
* Record video, put into about page


# Later
* Now we can only "verify". We also want to "fail" with a comment. So another button, which when pressed opens up a text box. on enter, send "fail" to server with comment. update status on backend, and smartly on front-end (no re-render of table)
* out-invoices: Our income. Will need to change some schemas and checkbox on upload invoice.

# Maybes
* auto upload pdfs, no button press?
Maybes / 