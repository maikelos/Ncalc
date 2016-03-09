Router.configure({
	layoutTemplate:'layout'
});
Router.map( function () {
/*this.route('bonus',{
		path: '/bonus/:date',
		 data: function (){
		    date  = new Date(this.params.date);
		    var day = date.getDate();
		    if (day<10) {day = '0' + day;}
		    var month = date.getMonth();
		    if (month<10) {month = '0' + month;}
		    var year = date.getFullYear();
		    templateData = {
		      date: date,
		      day : day,
		      month : month,
		      year : year
		    };
		    return templateData;
		  }
	});*/
	this.route('bonus');
  this.route('home', { path: '/' });
  this.route('notFound', {  path: '*'});
  this.route('login');
  this.route('register');
  this.route('calendar');
});
