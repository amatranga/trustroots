(function () {
  'use strict';

  angular
    .module('users')
    .controller('ProfileEditAccountController', ProfileEditAccountController);

  /* @ngInject */
  function ProfileEditAccountController(
    $http, Users, Authentication, messageCenterService, push, $scope) {

    // ViewModel
    var vm = this;

    // Exposed
    vm.updateUserEmail = updateUserEmail;
    vm.resendUserEmailConfirm = resendUserEmailConfirm;
    vm.updateUserSubscriptions = updateUserSubscriptions;
    vm.updatingUserSubscriptions = false;
    vm.changeUserPassword = changeUserPassword;
    vm.user = Authentication.user;

    // Related to profile removal
    vm.removeProfileConfirm = false;
    vm.removeProfileLoading = false;
    vm.removeProfileInitialized = '';
    vm.removeProfile = removeProfile;

    // Related to password reset
    vm.changeUserPasswordLoading = false;
    vm.currentPassword = '';
    vm.newPassword = '';
    vm.verifyPassword = '';

    // Push notifications
    vm.push = push;
    vm.pushUpdate = pushUpdate;
    vm.pushIsDisabled = pushIsDisabled;

    $scope.$watch(function () {
      return push.isEnabled;
    }, function (val) {
      vm.pushEnabled = val;
    });

    function pushUpdate() {
      if (vm.pushEnabled) {
        push.enable();
      } else {
        push.disable();
      }
    }

    function pushIsDisabled() {
      return push.isBusy || push.isBlocked || !push.isSupported;
    }

    /**
     * Change user email
     */
    function updateUserEmail() {
      vm.emailSuccess = vm.emailError = null;
      var user = new Users(Authentication.user);

      user.$update(function (response) {
        messageCenterService.add('success', 'Check your email for further instructions.');
        vm.emailSuccess = 'We sent you an email to ' + response.emailTemporary + ' with further instructions. ' +
                          'Email change will not be active until that. ' +
                          'If you don\'t see this email in your inbox within 15 minutes, look for it in your junk mail folder. If you find it there, please mark it as "Not Junk".';
        vm.user = Authentication.user = response;
      }, function (response) {
        vm.emailError = (response.data && response.data.message) || 'Something went wrong.';
      });
    }

    /**
     * Resend confirmation email for already sent email
     */
    function resendUserEmailConfirm($event) {
      if ($event) $event.preventDefault();
      if (vm.user.emailTemporary) {
        $http.post('/api/auth/resend-confirmation')
          .then(function () {
            messageCenterService.add('success', 'Confirmation email resent.');
          })
          .catch(function (response) {
            var errorMessage;
            if (response) {
              errorMessage = 'Error: ' + ((response.data && response.data.message) || 'Something went wrong.');
            } else {
              errorMessage = 'Something went wrong.';
            }
            messageCenterService.add('danger', errorMessage);
          });
      }
    }

    /**
     * Change user email subscriptions
     */
    function updateUserSubscriptions() {
      vm.updatingUserSubscriptions = true;
      var user = new Users(Authentication.user);
      user.$update(function (response) {
        messageCenterService.add('success', 'Subscriptions updated.');
        vm.user = Authentication.user = response;
        vm.updatingUserSubscriptions = false;
      }, function (response) {
        vm.updatingUserSubscriptions = false;
        messageCenterService.add('error', 'Error: ' + response.data.message);
      });
    }

    /**
     * Change user password
     */
    function changeUserPassword() {

      vm.changeUserPasswordLoading = true;

      $http.post('/api/users/password', {
        currentPassword: vm.currentPassword,
        newPassword: vm.newPassword,
        verifyPassword: vm.verifyPassword
      })
        .then(
          function (response) { // On success function
            vm.currentPassword = '';
            vm.newPassword = '';
            vm.verifyPassword = '';
            angular.element('#newPassword').val(''); // Fix to bypass password verification directive
            vm.changeUserPasswordLoading = false;
            vm.user = Authentication.user = response.data.user;
            messageCenterService.add('success', 'Your password is now changed. Have a nice day!');
          },
          function (response) { // On error function
            vm.changeUserPasswordLoading = false;
            messageCenterService.add('danger', ((response.data.message && response.data.message !== '') ? response.data.message : 'Password not changed due error, try again.'), { timeout: 10000 });
          }
        );

    }

    function removeProfile() {
      if (!vm.removeProfileConfirm) {
        return;
      }

      vm.removeProfileLoading = true;

      new Users(Authentication.user).$delete()
        .then(function (response) {
          vm.removeProfileInitialized = response.message || 'Success.';
        })
        .catch(function (response) {
          vm.removeProfileLoading = false;
          messageCenterService.add(
            'danger',
            response.message || 'Something went wrong while initializing profile removal, try again.',
            { timeout: 10000 }
          );
        });
    }

  }

}());
