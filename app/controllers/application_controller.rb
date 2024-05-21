class Extension::PopupController < ApplicationController
    def index
      # Optionally, set instance variables or perform any logic here
      render file: 'app/views/extension/popup/index.html.erb'
    end
  end
  