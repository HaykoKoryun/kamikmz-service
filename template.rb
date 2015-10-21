model = Sketchup.active_model
show_summary = true
Sketchup.open_file "{{import}}"
model.export "{{export}}"

Sketchup.quit
