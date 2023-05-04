# Leo Express Voucher Wizard

Simple REST service for creating vouchers for Leo Express. It also provides a simple web GUI interface for manually creating vouchers.

## Create voucher PDF
`GET /voucher`

### Query Parameters
    code => Actual voucher code i.e. 1234567890 or for multiple codes use , as delimeter i.e. 11111,22222,3333
    amount => Amount of voucher
    language => Language of voucher [cs, sk, en, pl, de, ua]
####
    Example URL:
    https://voucher-wizard.le.cz/voucher?amount=500&code=1243123123123&language=pl

### Response
    Server returns voucher single ZIP file with PDF vouchers ready to download
####
    HTTP/1.1 200 OK
    Server: Cowboy
    Connection: close
    Content-Type: application/pdf
    Content-Length: 498662
    Date: Wed, 04 Jan 2023 12:16:52 GMT
    Via: 1.1 vegur
    
    %PDF-1.7
    %
    
    8 0 obj
    <<
    /Type /XObject
    /Subtype /Image
    /BitsPerComponent 8
    /Width 2598
    /Height 1299
    ...

## Proudly powered by [Pan Vajíčko](https://en.wikipedia.org/wiki/Humpty_Dumpty)
![Humpty Dumpty](https://static.wikia.nocookie.net/shrek/images/5/56/Humpty_Dumpty.png)
