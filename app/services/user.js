var _ = require('lodash')
	, bcrypt = require('bcrypt')
	, randtoken = require('rand-token')
	, validator = require('validator')
	, listMessage = require('../../libs/helpers/message-list')
	, listErrors = require('../../libs/helpers/errors-list')
	, ValidationModel = require('../../libs/models/response/validation')
	, ValidateAttribute = require('../../libs/models/validate/attribute')
	, UserModel = require('../models/user/user')
	, AccessModel = require('../../libs/models/log/access')
	// , CacheRedis = require('../../config/initializers/cache-redis')
	// , Cache = new CacheRedis()
	, SuccessModel = require('../../libs/models/response/success')
	, UserValidate = require('../../libs/helpers/user')
	, TokenService = require('./token')
	, PinCode = require('../../libs/helpers/pin-code')
	, FailModel = require('../../libs/models/response/fail')
	, async = require('async')
	, config = require('nconf');

class UserService {

	constructor() { }

	static createUserFacebook(request, accessToken) {
		return UserModel.createUserFacebook(request)
			.then(user_new => {
				user_new.create = true;
				return user_new;
			});
	}

	static addUserFacebook(request, accessToken) {
		return UserModel.addUserFacebookProfile(request)
			.then(user_new => {
				user_new.create = false;
				return user_new;
			});
	}

	static createUserLogin(user, petition) {
		var accessToken = TokenService.generateAccessToken();
		var _petition;
		
		if(user && user.name)
			user.name = UserValidate.clearChar(user.name);

		return ValidationModel.validateRequest('user', 'ErrorUserValidate', user)
			.then(success => {
				return UserModel.findByEmailOrProfile(user.email, null);
			})
			.then(user_find => {
				if (!user_find) {
					return UserModel.createUserLogin({ name: user.name, email: user.email, hashPassCrypth: bcrypt.hashSync(user.password, bcrypt.genSaltSync(9)), picture: facebook.generateImgLink(null, 'user', null, 'normal') })
				} else {
					throw new ValidationModel('fail', 'validation', listErrors['ErrorUserCreate'].message, [new ValidateAttribute('email', listErrors['ErrorUserEmailDuplicate'].message)], listErrors['ErrorUserCreate'].errorCode);
				}
			})
			.then(user_set => {
				return true ;//Cache.setKey(accessToken.access_token, JSON.stringify(user_set)).then((user_set_cache) => JSON.parse(user_set_cache));
			})
			.then(user_new => {
				if (petition && petition.versionId) {
					return PetitionModel.findByIdVersionPettion(petition.versionId)
						.then(petition => {
							if (!petition || !petition.petition_id_version) {
								throw new ValidationModel('fail', 'validation', listErrors['ErrorPetitionNotFound'].message, [new ValidateAttribute('message', listErrors['ErrorPetitionNotFound'].message)], listErrors['ErrorPetitionNotFound'].errorCode);
							} else {
								_petition = petition;
								return user_new;
							}
						})
				} else {
					return user_new;
				}
			})
			.then(user_new => {
				async.queue(NotificationService.sendMessage('EmailNotification', user_new, _petition, NotificationService.generateLinkNotificationEmail(user_new, 'Notification_Email', accessToken)), 1);
				delete user_new.token_type;
				return new SuccessModel('success', { complete: UserValidate.validateComplete(user_new), user: user_new, access_token: accessToken.access_token });
			});
	}

	static reSendValidation(user) {
		var accessToken = TokenService.generateAccessToken();
		return ValidationModel.validateRequest('email', 'ErrorUserValidate', user)
			.then(success => {
				return UserModel.findByEmailOrProfile(user.email, null);
			})
			.then(user_new => {
				if(user_new){
					async.queue(NotificationService.sendMessage('EmailNotification', _.first(user_new), null, NotificationService.generateLinkNotificationEmail(_.first(user_new), 'Notification_Email', accessToken)), 1);
					delete user_new.token_type;
				}
				return new SuccessModel('success', { message: listMessage['MessageValidationAccount'] })
			})
	}

	static updateUserLogin(user, accessToken) {
		var _userCache;
		return Cache.getKey(accessToken)
			.then(user_cache => {
				_userCache = JSON.parse(user_cache);
				if (!_userCache) {
					throw new ValidationModel('fail', 'validation', listErrors['ErrorCacheEmpty'].message, [new ValidateAttribute('user', listErrors['ErrorCacheEmpty'].message)], listErrors['ErrorCacheEmpty'].errorCode)
				} else {
					return UserService.updateUser(user, accessToken);
				}
			})
			.then(user_new => {
				if (_userCache.profile_email !== user_new.profile_email) {
					async.queue(NotificationService.sendMessage('EmailNotification', user_new, null, NotificationService.generateLinkNotificationEmail(user_new, 'Notification_Email', { access_token: accessToken })), 1);
				}
				return user_new;
			})
			.then(user => {
				if (_userCache.profile_email != user.profile_email) {
					return Cache.setKey(accessToken, JSON.stringify(user)).then((user_set_cache) => JSON.parse(user_set_cache));
				} else {
					return user;
				}
			})
			.then(user => {
				if (_userCache.profile_email != user.profile_email)
					return UserModel.updateValidate(user, null)
				return user;
			})
			.then(user => {
				return new SuccessModel('success', { complete: UserValidate.validateComplete(user), user: user, access_token: accessToken })
			})
	}

	static updateUser(user, accessToken) {
		var token = TokenService.generateAccessToken();
		var _user;
		user.name = UserValidate.clearChar(user.name);
		return ValidationModel.validateRequest('userUpdate', 'ErrorUserValidate', user)
			.then(success => {
				return Cache.getKey(accessToken)
			})
			.then(user_cache => {
				return UserModel.updateUserLogin({ name: user.name, email: user.email }, JSON.parse(user_cache))
			})
			.then(user_set => {
				_user = user_set;
				return Cache.setKey(accessToken, JSON.stringify(user_set));
			})
			.then(ok => {
				return _user;
			})
	}

	static findById(id) {
		return UserModel.findById(id)
			.then(user => {
				return new SuccessModel('success', { user: user });
			})
	}

	static resetPassword(userReset) {
		var _user;
		if (!validator.isEmail(userReset.email)) {
			return new Promise((resolve, reject) => {
				resolve(new SuccessModel('success', { message: listMessage['MessageResetPassword'] }));
			});
		} else {
			var pinCode = PinCode.generatePincode(6);
			return UserModel.findByEmailOrProfile(userReset.email)
				.then(users => {
					if (users && users.length) {
						var user = _.find(users, { 'profile_type': 'app' }) ? _.find(users, { 'profile_type': 'app' }) : _.find(users, { 'profile_type': 'facebook' });
						if (!user || user.profile_type == 'facebook') {
							async.queue(NotificationService.sendMessage('ResetPasswordNotificationFacebook', user, pinCode), 1);
							return null;
						} else {
							return Cache.setKey(pinCode, JSON.stringify({ email: userReset.email, pinCode: pinCode }), config.get('CACHE_TIME_RESET_PASSWORD')).then(() => user);
						}
					} else {
						return null;
					}
				})
				.then(user => {
					_user = user;
					if (_user) {
						return BlackListModel.deleteById(_user.user_id);
					} else {
						return false;
					}
				}).then(success => {
					if (success) {
						return AccessModel.deleteByUser(_user.user_id, 1)
					} else {
						return null;
					}
				})
				.then(user => {
					if (user) {
						async.queue(NotificationService.sendMessage('ResetPasswordNotification', _user, pinCode), 1);
					}
					return true;
				})
				.then(ok => {
					return new SuccessModel('success', { message: listMessage['MessageResetPassword'] });
				})
		}
	}

	static removeAccount(userRemove) {
		var _user;
		if (!validator.isEmail(userRemove.email)) {
			return new Promise((resolve, reject) => {
				resolve(new SuccessModel('success', { message: listMessage['MessageResetPassword'] }));
			});
		} else {
			var token = TokenService.generateAccessToken();
			return UserModel.findByEmail(userRemove.email)
				.then(user => {
					if(user)
						async.queue(NotificationService.sendMessage('RemoveAccountNotification', user,null, NotificationService.generateLinkNotificationEmail(user, 'Remove_Account_Email', token)), 1);
					return true;
				})
				.then(ok => {
					return new SuccessModel('success', { message: listMessage['MessageRemoveAccount'] });
				})
		}
	}

	static updateUserPasswordPinCode(user) {

		var token = TokenService.generateAccessToken();

		return ValidationModel.validateRequest('userPasswordPinCode', 'ErrorUserReset', user)
			.then(ok => {
				return PinCode.validatePinCode(user.pincode, user.pincode, 'ErrorUserReset', 'ErrorPinCode')
			})
			.then(userPincode => {
				return UserModel.findByEmail(userPincode.email)
			})
			.then(user_cache => {
				user.newPassword = bcrypt.hashSync(user.password, bcrypt.genSaltSync(9));
				return UserModel.updatePassword(user, user_cache).then(() => user_cache);
			})
			.then(user_cache => {
				return Cache.setKey(token.access_token, JSON.stringify(user_cache))
			})
			.then(user_cache => {
				user_cache = JSON.parse(user_cache);
				return new SuccessModel('success', { complete: UserValidate.validateComplete(user_cache), user: user_cache, accessToken: token.access_token })
			})
	}

	static updatePassword(user, accessToken) {
		return ValidationModel.validateRequest('userPassword', 'ErrorUserReset', user)
			.then(success => {
				return Cache.getKey(accessToken)
			})
			.then(user_cache => {
				return UserModel.findByEmailAndPassword(JSON.parse(user_cache).profile_email);
			})
			.then(user_db => {
				if (!user_db || user_db.user_password == null)
					throw new FailModel('fail', 'authentication', listErrors['ErrorUserNotFound'].message, listErrors['ErrorUserNotFound'].errorCode);
				else if (user_db.user_password !== null && !bcrypt.compareSync(user.currentPassword, user_db.user_password))
					throw new ValidationModel('fail', 'validation', listErrors['ErrorUserPassword'].message, [new ValidateAttribute('currentPassword', listErrors['ErrorUserPassword'].message)], listErrors['ErrorUserPassword'].errorCode);
				else {
					delete user_db.user_password;
					return user_db;
				}
			})
			.then(user_cache => {
				user.newPassword = bcrypt.hashSync(user.newPassword, bcrypt.genSaltSync(9));
				return UserModel.updatePassword(user, user_cache).then(() => user_cache);
			})
			.then(user_cache => {
				return new SuccessModel('success', { complete: UserValidate.validateComplete(user_cache), user: user_cache })
			});
	}

	static sendNotificationMailUser(user, petition, access_token) {
		if (user && user.create && user.profile_email) {
			var link = NotificationService.generateLinkNotificationEmail(user, 'Notification_Email', { access_token: access_token });
			if (petition && petition.versionId) {
				PetitionModel.findByIdVersionPettion(petition.versionId)
					.then(petition => {
						if (petition && !validator.isEmpty(user.profile_email)) {
							async.queue(NotificationService.sendMessage('EmailNotification', user, petition, link), 1);
							return true;
						}
					})
			} else {
				async.queue(NotificationService.sendMessage('EmailNotification', user, null, link), 1);
				return true;
			}
		}
	}

	static count() {
		return UserModel.count()
			.then(body => {
				return new SuccessModel('success', body);
			}
			)
	}
}

module.exports = UserService;
