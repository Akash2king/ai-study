
import React, { useState } from 'react';
import ClipboardIcon from './icons/ClipboardIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import { useStudyContext } from '../contexts/StudyContext';

const TaskBoard: React.FC = () => {
  const { tasks, addTask: contextAddTask, updateTask, deleteTask } = useStudyContext();
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    contextAddTask(newTaskText, newTaskDate);
    setNewTaskText('');
    setNewTaskDate('');
  };

  const startEditing = (id: string, text: string, date: string) => {
    setEditingId(id);
    setEditText(text);
    setEditDate(date);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      updateTask(id, { text: editText, dueDate: editDate });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditDate('');
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center mb-8">
        <ClipboardIcon className="w-8 h-8 text-blue-400 mr-3" />
        <h1 className="text-3xl font-bold">Task Management</h1>
      </div>

      <form onSubmit={handleAddTask} className="bg-gray-800 p-6 rounded-lg mb-8 flex gap-4 flex-wrap md:flex-nowrap">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow bg-gray-700 border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <input
          type="date"
          value={newTaskDate}
          onChange={(e) => setNewTaskDate(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-auto"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap"
          disabled={!newTaskText.trim()}
        >
          Add Task
        </button>
      </form>

      <div className="flex-grow overflow-y-auto bg-gray-800 rounded-lg p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No tasks yet. Add one or generate a course to get started!
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all ${task.completed ? 'bg-gray-800/50 border-gray-700 opacity-75' : 'bg-gray-750 border-gray-600 hover:border-gray-500'}`}
            >
              {editingId === task.id ? (
                <div className="flex flex-grow gap-4 items-center w-full">
                  <input 
                    type="text" 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-grow bg-gray-900 border border-blue-500 rounded p-2 text-white"
                  />
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-gray-900 border border-blue-500 rounded p-2 text-white"
                  />
                  <button onClick={() => saveEdit(task.id)} className="text-green-400 hover:text-green-300 text-sm font-bold px-3">Save</button>
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-300 text-sm px-3">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 flex-grow mb-2 md:mb-0">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => updateTask(task.id, { completed: !task.completed })}
                      className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    />
                    <div className="flex flex-col">
                      <span className={`text-lg ${task.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {task.text}
                      </span>
                      {task.dueDate && (
                        <span className={`text-xs ${new Date(task.dueDate) < new Date() && !task.completed ? 'text-red-400' : 'text-gray-400'}`}>
                          Due: {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={() => startEditing(task.id, task.text, task.dueDate)}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskBoard;
