Rails.application.routes.draw do
  namespace :extension do
    get 'popup', to: 'popup#index'
  end  
end
