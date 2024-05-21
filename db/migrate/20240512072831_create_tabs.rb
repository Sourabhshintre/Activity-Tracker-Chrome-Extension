class CreateTabs < ActiveRecord::Migration[7.1]
  def change
    create_table :tabs do |t|
      t.string :title
      t.string :url
      t.boolean :active
      t.integer :time_spent_in_sec

      t.timestamps
    end
  end
end
