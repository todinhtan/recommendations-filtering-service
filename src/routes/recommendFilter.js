import post from '../controllers/recommendFilter';

module.exports = (api) => {
  api.route('/').post(post);
};
