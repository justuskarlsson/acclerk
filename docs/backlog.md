
* Error when uploading multiple pdfs, looking through preview of multiple pdfs:
Error: Runtime TypeError
Cannot read properties of null (reading 'sendWithPromise')
components/pdf/PDFDocument.tsx (124:25) @ PDFDocumentViewer

# Later
* Now we can only "verify". We also want to "fail" with a comment. So another button, which when pressed opens up a text box. on enter, send "fail" to server with comment. update status on backend, and smartly on front-end (no re-render of table)
* out-invoices: Our income. Will need to change some schemas and checkbox on upload invoice.

# Maybes
* auto upload pdfs, no button press?
Maybes / 