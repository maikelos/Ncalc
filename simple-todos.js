var username = new Tracker.Dependency();
var CalEvents = new Mongo.Collection("CalEvents");
var Rates = new Mongo.Collection("Rates");
var UserForms = new Mongo.Collection("UserForms");
var Warehouse = new Mongo.Collection("Warehouses");
var Forms = new Mongo.Collection("Forms");


FillModal = function(date){  //date jest rowny albo dacie albo query
  console.log("filling modal");
  try {  // sproboj date.format jak wywali blad to znaczy ze jest to query 
    $('.modal-title').text("Adding   " + date.format("DD-MM-YYYY")); 
  }
  catch(err) { // w przypadku error (query) zrob to co ponizej
    date.forEach(function(entry){ // dla kazdego dokumenty w query wykonaj funkcje gdzie entry bedzie sie rownal kolejene dokumenty z query (jest tylko jeden dokument no ale zamienia query na dogodny format)
      if (entry.code.length>3){ // jezeli code istnieje
        Session.set('IsCode', true);  //Zapisuje czy jest Code zeby potem wyswietlic addbonus albo performance i hajs
        $("#Percentbutt").text((Calculate("Percent",entry.code)).toString()+"%"); //dodaj text z performancem
        $("#Moneybutt").text("£"+(Calculate("Money",entry.code)).toString()); //dodaj text z hajsem
        $("#codeArea").val(entry.code);  // wpisz kod w code tab
      }else{$("#codeArea").val("Check out the FAQ to learn about this tab");} //jak nie ma kodu to wpisz tekst
      $('.modal-title').text("Editing   " + moment(entry.start).format("DD-MM-YYYY")); //skoro to jest query czyli dzien istnieje, to editing day a nie adding
      $("input[name='od']").val(moment(entry.start).format("HH:mm")); //od godzina
    	$("input[name='do']").val(moment(entry.end).format("HH:mm")); // do godzina        fullcalendar uzywa moment a mongodb ISO ......
    });
  }
  $('a[href="#bonus"]').tab('show');
}

Calculate = function(output,dane){ //output (percent czy money) , dane (code z dnia)
  rates = Rates.find({}); // zbierz wszystkie rate'y
  var index = 0;
  var MoneyRate = [0.71,0.781,0.853,0.923,0.993,1.064,1.137,1.206,1.277,1.35,1.422,1.491,1.561,1.634,1.704,1.776,1.846,1.917,1.988,2.063,2.13,,2.202,2.273,2.342,2.414,2.484,2.556,2.629,2.699,2.768,3.107,3.177,3.249,3.589,3.658,3.731,4.066,4.139,4.209,4.28,4.353]; // hajs za poszczegolny performance
  var timeon = 0,timeoff = 0,shift = 0,allowance = 0,indirect = 0;
  var code;
  rates.forEach(function(ratesy){ // w rates jest tylko jeden dokument ale .forEach wyciaga ten dokument z dziwnego obiektu query i zamienia go w prosty obiekt z dokumentem
    for(i=0;i<dane.split(";").length;++i){  // dane.split(;).length = tyle ile jest zmiennych w code czyli picki , shift , timeoff ...
      if (dane.indexOf(";", index+1)>0){ // Jezeli jest ; po pozycji index+1
        var srednik = dane.indexOf(";", index+1); // srednik = rowna sie tej pozycji
      }else{ // jezeli po pozycji index+1 nie ma srednika
        var srednik = dane.length; // srednik jest rowny dlugosci code
      }
      code = dane.substring(index, dane.indexOf("=",index)); // odczytuje zmienne pomiedzy ; a =
      var ile = dane.substring(dane.indexOf("=",index)+1, srednik); // odczytuje to co jest pomiedzy = a ;
      //console.log(srednik + "  " + code + "  " + ile +"  " + timeon);
      switch (code){ // zaleznie od zmiennej 
        case "timeoff": // jezeli w codzie jest ;timeoff=125 
          timeoff = ile; // ustaw zmienna timeoff na ile czyli 125
          break;
        case "shift":
          shift = ile;
          break;
        case "allowance":  // to samo jest tu wszedzie, wsyzstkie "stale" trzeba zdefiniowac tutaj
          allowance = ile;
          break;
        case "indirect":
          indirect = ile;
          break;  
        default:
          if (ratesy[code] == undefined){  //jezeli ratesy[code] nie istnieje ... ratesy.code to po prostu inna skladnia ale to samo
            timeon = code; //zmien timeon na cos co rozwali algorytm i 
          }else{
            timeon += ratesy[code] * parseInt(ile);  // dodaj do timeon'u ten rate razy liczba po znaku "="
          }
          break;
      }
      if (srednik > index){
        index = srednik + 1;
      }
    }
  });
  //console.log("ok3");
  if (timeon == 0 || isNaN(timeon)){
    console.log(code); //jaka zmienna jest niepoprawna
    return "Invalid data";
  }else{
    switch (output){
      case "Percent":
        return  (Math.floor((timeon/(shift-timeoff-indirect))*10000))/100;
        break;
      case "Money":
        var Percent = (Math.floor((timeon/(shift-timeoff-indirect))*100))+1;
        if (Percent - 85 < 0){var hajs=0;}
        else if (Percent - 85 > 40){var hajs = MoneyRate[40];}
        else{ var hajs = MoneyRate[Percent-85]}
        return (Math.floor((((shift-timeoff-indirect)/60) * hajs)*100))/100;
        break;
      default:
        return "Wrong output format";
    }
  }
}

  ManageDisplayedForm = function(typ,formname){
    temp = Session.get("DisplayedForms");
    if (typ =="add"){
      if (typeof temp == 'undefined'){
        //console.log("Undefined :" + temp);
        var temp = [formname];
      }else{
        if (temp.indexOf(formname) == -1){
          console.log("dodano");
          temp.push(formname);
        }
        else{
          return false;
          console.log("nie dodano");
        }
      }      
    }
    else if(typ =="remove"){
      temp.splice(temp.indexOf(formname),1);
    }
    Session.set("DisplayedForms",temp);
  }

if (Meteor.isClient) {
  Template.main.rendered = function(){
    var calendar = $('#calendar').fullCalendar({
      dayClick:function(date, allDay, jsEvent, view){   //Event clickniecie dnia (nie eventu dnia)
        dateSave = new Date(date);  //zamienia date na format ISO 
        Session.set('FormDate', dateSave);  // zapisuej date eventu w formacie iso
        var query = CalEvents.find({   //Pobiera dane z dnia który został kliknięty
          owner:Meteor.userId(),
          start:{$gte: new Date(date.toISOString()),   // $GreaterThan or Equal od daty tego dnia
          $lt: new Date(date.add(1,"days").toISOString()) // $LessThan od daty dnia następnego
        }});
         $(".modal").modal("toggle"); // jak modal został już wypełniony to toggle modal (pokaż)
        if (query.count()) {  //jeżeli query coś zwróciło czyli że dzień jest zapisany i istnieje
          var temp = query.fetch();  //zamienia query w prosty obiekt z dokumentem z bazy danych
          Session.set('EditingId',temp[0]._id ); //Zapisuje ID dokumentu na wypadek gdyby user kliknął delete
          Session.set('IsEvent', "update");  //Jeżeli jakieś dane zostaną zmienione no to będą one updateowane. 
          if (temp[0].code.length>3){
            Session.set("IsCode",true);
          }else {
            Session.set("IsCode",false);
          }
          FillModal(query);  // wyślij dane do fillmodal funkcji
        }
        else{
          Session.set('IsCode', false);  //Zapisuje czy jest Code zeby potem wyswietlic addbonus albo performance i hajs
          Session.set('IsEvent', "insert");  // dnia nie ma więc w razie co będzie insert
          FillModal(date);   //Jeżeli nie ma tego dnia w bazie to po prostu wyślij date
        }
       
      },
      defaultView: 'month',
      displayEventTime: true,
      displayEventEnd:true,
      timeFormat: 'H:mm' ,
      dayRender: function (date,cell){
      },
      eventRender: function(event, element) {
      },
      events:function(start,end,timezone, callback){
      var CalenEvents = CalEvents.find({owner:Meteor.userId()},{reactive:false}).fetch();
      callback(CalenEvents);

      },
      editable: true,
      eventResize: function(event, delta, revertFunc) {
        alert(event.title + " end is now " + event.end.format());
        if (!confirm("is this okay?")) {
            revertFunc();
        }
      }
    }).data().fullCalendar;
    CalEvents.find().observeChanges({
      added: function(id, fields) {
        CalEvents.find().fetch();
        if (calendar){
          calendar.refetchEvents();
        }
      },
      changed: function(id, fields){
        if (calendar){
          calendar.refetchEvents();
        }
      }
    });
  }

  /*------------------------ END OF CALENDAR ------------------------*/

  Template.calendar.events({
    "click .save": function(evnt, tmpl){
      calendarEvent = {};
      var currentDateOd = moment(Session.get('FormDate'));
      var currentDateDo = moment(currentDateOd);
      var EndAddDay = 0;
      var Timeod = $(tmpl.find("input[name='od']")).val();
      var Timedo = $(tmpl.find("input[name='do']")).val()
      //console.log(Timeod+" "+Timedo);
      if (moment(Timedo,"HH:mm").diff(moment(Timeod,"HH:mm"))<0){ //Co prawda zmienia date na nastepny dzien ale nie do konca dziala
      	EndAddDay = 24;
      }
      if (Timeod == "" || Timedo == "") {
      	alert("Please fill in the time inputs.");
      }else{
        calendarEvent.start = new Date(Date.parse((currentDateOd.add(parseInt((Timeod).substr(0,2)),"hours").add(parseInt((Timeod).substr(3,2)),"minutes")).toISOString()));
        calendarEvent.end = new Date(Date.parse((currentDateDo.add(parseInt((Timedo).substr(0,2))+EndAddDay,"hours").add(parseInt((Timedo).substr(3,2)),"minutes")).toISOString()));
        calendarEvent.title = $(tmpl.find("#typof :selected")).val();
        calendarEvent.owner = Meteor.userId();
        calendarEvent.code = $(tmpl.find("#codeArea")).val();
        switch($(tmpl.find("#typof :selected")).val()) {
        case "Overtime":
            calendarEvent.color="#FFA317";
            break;
        case "Contracted":
            calendarEvent.color="#95D116";
            break;
        case "Flex Up":
            calendarEvent.color="#FE4625";
            break;
        case "Flex Down":
            calendarEvent.color="#17A8FF";
            break;  
        case "Holiday":
            calendarEvent.color="#07DB00";
            break;      
        }
        //console.log(Session.get('IsEvent'));
        //console.log(calendarEvent);
        Meteor.call('saveCalEvent', Session.get('IsEvent'),calendarEvent,new Date(Session.get('FormDate')),new Date(moment(Session.get('FormDate')).add(1,"days").toISOString()));
        $(tmpl.find('.modal-body')).find("input[type=time]").val("");
        $(".modal").modal("hide");
      }
    },
    "click .delete": function(event, tmpl){
      Meteor.call('saveCalEvent', "remove","" ,"" ,"" ,Session.get("EditingId"));
      $('#calendar').fullCalendar('removeEvents', Session.get('EditingId'));
      $(".modal").modal("hide");
    },
    "click .close, click .cancel": function(event, tmpl){
      $(".modal").modal("hide");
    },
    "click .addbonus": function(event,tmpl){
      $(".modal").modal("hide");

      Router.go("bonus");
      $(".modal-backdrop").remove();
    }
  });  
  Template.form.events({
     'hidden.bs.modal': function(event,tmpl){
      console.log("hiding modal");
        $(tmpl.find("input[name='do']")).val("");
        $(tmpl.find("input[name='od']")).val("");
        $(tmpl.find("#codeArea")).val("");
        Session.set("IsCode",false);
        Session.set("EditingId", false);
        Session.set("FormDate", false);
      }
  });
  Template.form.helpers({
    IsCode: function(){
      return Session.get("IsCode");
    },
    Percentbutt: function(){
      if (Session.get("EditingId").length>2){
        temp = CalEvents.find({_id:Session.get("EditingId")}).fetch();
        console.log(temp);
        console.log((Calculate("Percent",temp[0].code)).toString()+"%");
        return (Calculate("Percent",temp[0].code)).toString()+"%";
      }else{
        return "%";
      }
    },
    Moneybutt: function(){
      if (Session.get("EditingId").length>2){
        temp = CalEvents.find({_id:Session.get("EditingId")}).fetch();
        return "£"+(Calculate("Money",temp[0].code)).toString();
      }
      else{
        return "£";
      }
    }
  });
  /*------------------------------------------- END OF CALENDAR PAGE ------------------------------*/
  /*------------------------------------------- BONUS PAGE ------------------------------------*/
  Template.bonus.helpers({
    Userform: function(){
      return UserForms.find({owner:Meteor.userId()});
    },
    warehouse: function(){
      return Warehouse.find({});
    },
    DisplayForm: function(){
      console.log(Session.get("DisplayedForms"));
      return Session.get("DisplayedForms");
    },
    BonusEditedDay: function(){
      return moment(Session.get("FormDate")).format("DD-MM-YYYY");
    }
  });
  Template.bonus.rendered = function(){
    //console.log( new Date(moment(Session.get("FormDate")).add(1,"days").toISOString()));
    var query = CalEvents.find({
          owner:Meteor.userId(),
          start:{$gte: new Date(Session.get("FormDate")),
          $lt: new Date(moment(Session.get("FormDate")).add(1,"days").toISOString())
        }});
    var dane = query.fetch();
    var from = moment(dane[0].start).format("HH:mm");
    var to = moment(dane[0].end).format("HH:mm");
    $("#shift1").val(from);
    $("#shift2").val(to);

  };
  Template.bonus.events({
    'keyup .form-control, change .form-control': function(e,tmpl){
      var data = $(e.target).val();
      var stringArray = data.split(",");
      var sum=0,temp=0;
      for( i=0;i<stringArray.length;i++){
          try{
              temp = parseInt(stringArray[i]);
              if (isNaN(temp)){}
              else{sum += temp;  }             
          }catch(e){
              //console.log("1 : Input Sum error");
          }
      }
      $("input[name="+$(e.target).attr("name")+"S]").val(sum);
    },
    'click #Savebutt': function(e,tmpl){
      //console.log($(tmpl.find("#shift2")).val()+" "+$(tmpl.find("#shift1")).val());
      var shift = moment.utc(moment($(tmpl.find("#shift2")).val(),"HH:mm").diff(moment($(tmpl.find("#shift1")).val(),"HH:mm")))/60000;
      if(shift > 360 && shift < 390){
        shift =360;
      }else {shift-=30;}
      var timeoff = parseInt($(tmpl.find("#timeoff")).val());
      var indirect = parseInt($(tmpl.find("#indirect")).val());
      //console.log(timeoff+ "  " + isNaN(timeoff) + "  " + indirect + "   " + isNaN(indirect));
      if (shift <= 0){
        alert("Za krotki shift");
      }
      else if (indirect+timeoff > shift){
        alert("Zbyt dużo indirect/timeoff.");
      }
      else{
        var code = "shift="+shift;
        if (timeoff > 0){code+=";timeoff="+timeoff}
        if (indirect > 0){code+=";indirect="+indirect}
        $.each($('#Bonus').serializeArray(), function() {
          var name=[this.name].toString();
          if (name.lastIndexOf("S")>1){
            tempStr = String([this.name]);
            code += ";"+tempStr.substring(0,tempStr.length-1)+"="+this.value;
          }
        });
        ce = {};
        ce.code = code;
        Meteor.call("saveCalEvent", Session.get("IsEvent"),ce, new Date(Session.get('FormDate')),new Date(moment(Session.get('FormDate')).add(1,"days").toISOString()));
      }
    },
    "click .close":function(e){
      var formname=$(e.target).parent().text().slice(0,-2);
      //console.log(formname);
      ManageDisplayedForm("remove",formname);
    }
  });
  Template.Warehouselist.helpers({
    Forms: function(){
      var warehouse = Template.currentData().warehouse;
      return Forms.find({Warehouse:warehouse});
    }
  });
  Template.formlist.events({
    "click .close": function(e){
      var formname = $(e.target).parent().text().slice(0,-1);
      Meteor.call('removeUserForm', Meteor.userId(),formname);
    },
    "click .FormButtons": function(e){
     var formname = $(e.target).text().slice(0,-1);
     ManageDisplayedForm("add", formname);
    }  
  });
  Template.WarehouseListLI.events({
    "click .addform": function(e){
      var formname = $(e.target).text();
      ManageDisplayedForm("add", formname);
      temp = UserForms.find({owner:Meteor.userId(),FormName:$(e.target).text()});
      if (temp.count()){}
      else{UserForms.insert({owner:Meteor.userId(),FormName:$(e.target).text()});}
    }
  })
  Template.register.events({
    "submit .register": function(event){
      event.preventDefault();
      var email = $('[name=email]').val(); 
      var password = $('[name=password]').val();
      var username = $('[name=username]').val(); 
      Accounts.createUser({
        email: email,
        password: password,
        username: username
      });
      Router.go("home");
    }
  });

  Template.login.events({
    "submit .login": function(event){
      event.preventDefault();
      var username = $('[name=username]').val(); 
      var password = $('[name=password]').val(); 
      Meteor.loginWithPassword(username, password);
      Router.go("home");
    }
  });

  Template.layout.events({
    'click #logout': function(event){
      event.preventDefault();
      Meteor.logout();
      Router.go("home");
    }
  });

  Template.layout.helpers({
    isActive: function(key){
      if (key==Router.current().route.getName()){
        return "active";
      }else{
        return "";
      }
    }
  });
  Template.home.onRendered(function(){
    console.log("rendered");
    $(window).resize(function() {
      console.log("resize");
      var h = $(window).height();
      var w = $(window).width();
      console.log("window W: " + w + " " + "Window H: " +h);
      $("#homepic").height(h-150);
     // $("#homepic").width((h-150)*2.67);
      if ($("#homepic").width() > w){
      //  var offset = ($("#homepic").width() - w)/2;
      //  $("#homepic").css("margin-left","-"+offset+"px");
      }
    });
  });

  Template.username.helpers({
    user: function(){
      return Meteor.user().username;
    }
  });
  
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

if (Meteor.isServer){
  Meteor.startup(function (){
    Meteor.methods({
      'saveCalEvent':function(type,ce, odday, doday,id){
        //console.log(type);
        switch(type){
          case "update":
            CalEvents.update({owner:Meteor.userId(),start:{$gte: odday,$lt: doday}}, {$set:ce});
            break;
          case "insert":
          //console.log(Meteor.userId());
            //console.log(ce);
            CalEvents.insert(ce);
            break;  
          case "remove":
            CalEvents.remove({_id:id});
            break;
          default:
            //console.log('Unrecognized type of action');
        }
      },
      'removeUserForm': function(owner,formname){
        UserForms.remove({owner:owner,FormName:formname});
      },
      'addUserForm': function(owner,formname){
        UserForms.update({owner:owner,FormName:formname},{owner:owner,FormName:formname},{upsert:true});
      }
    })
  });
}


