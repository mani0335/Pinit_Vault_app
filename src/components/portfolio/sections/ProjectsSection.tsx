import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProjectEntry } from "@/types/portfolioBuilder";

interface ProjectsSectionProps {
  projects: ProjectEntry[];
  onChange: (projects: ProjectEntry[]) => void;
}

export function ProjectsSection({ projects, onChange }: ProjectsSectionProps) {
  const addProject = () => {
    const newEntry: ProjectEntry = {
      id: Date.now().toString(),
      name: "",
      description: ""
    };
    onChange([...projects, newEntry]);
  };

  const updateProject = (id: string, field: keyof ProjectEntry, value: string) => {
    onChange(projects.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeProject = (id: string) => {
    onChange(projects.filter(entry => entry.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Projects</h2>
        <button
          onClick={addProject}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-12 text-center shadow-xl">
          <p className="text-gray-400 mb-4">No projects yet</p>
          <button
            onClick={addProject}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all"
          >
            <Plus size={16} />
            Add Your First Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-purple-300">
                  Project {index + 1}
                </h3>
                {projects.length > 1 && (
                  <button
                    onClick={() => removeProject(entry.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-purple-300 text-sm font-semibold mb-2 block">
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., E-commerce Platform"
                    value={entry.name}
                    onChange={(e) => updateProject(entry.id, 'name', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
                  />
                </div>

                <div>
                  <label className="text-purple-300 text-sm font-semibold mb-2 block">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your project, technologies used, and your role..."
                    rows={4}
                    value={entry.description}
                    onChange={(e) => updateProject(entry.id, 'description', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
