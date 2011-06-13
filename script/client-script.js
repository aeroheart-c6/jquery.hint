$(document).ready (function (event) {
  $.mockjax ({
    url:  'server-script/getFriends.php',
    proxy:'static/mock-data/users-friends.json'
  });  
});
