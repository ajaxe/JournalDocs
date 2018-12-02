var custom = {
    convertDateFromUtc: function(utcDate) {
        if(!utcDate) {
            return '';
        }
        var dt = utcDate.replace(' ', 'T') + 'Z';
        var dtTz = moment(dt).tz(moment.tz.guess());
        document.getElementById('compile-dt').textContent = dtTz.format("dddd, MMMM Do YYYY, h:mm:ss a z");
    }
}