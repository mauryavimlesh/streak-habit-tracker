const fs = require('fs');
let code = fs.readFileSync('src/pages/Calendar.tsx', 'utf8');

code = code.replace(
  `<DaySchedule
          selectedDate={selectedDate}
          tasks={tasks}
          onToggleTask={toggleTaskComplete}
          onEditTask={openEditModal}
          onDeleteTask={handleDeleteClick}
          onOpenAddModal={openAddMenu}
        />`,
  `<DaySchedule
          selectedDate={selectedDate}
          tasks={tasks}
          habits={habits}
          logs={logs}
          activities={activities}
          goals={goals}
          journals={journals}
          onToggleTask={toggleTaskComplete}
          onEditTask={openEditModal}
          onDeleteTask={handleDeleteClick}
          onOpenAddModal={openAddMenu}
        />`
);

fs.writeFileSync('src/pages/Calendar.tsx', code);
