import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EducationEntry } from "@/types/portfolioBuilder";

interface EducationSectionProps {
  education: EducationEntry[];
  onChange: (education: EducationEntry[]) => void;
}

export function EducationSection({ education, onChange }: EducationSectionProps) {
  const addEducation = () => {
    const newEntry: EducationEntry = {
      id: Date.now().toString(),
      degree: "",
      institution: "",
      year: ""
    };
    onChange([...education, newEntry]);
  };

  const updateEducation = (id: string, field: keyof EducationEntry, value: string) => {
    onChange(education.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeEducation = (id: string) => {
    onChange(education.filter(entry => entry.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Education</h2>
        <button
          onClick={addEducation}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all"
        >
          <Plus size={16} />
          Add Education
        </button>
      </div>

      {education.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-12 text-center shadow-xl">
          <p className="text-gray-400 mb-4">No education entries yet</p>
          <button
            onClick={addEducation}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white font-semibold transition-all"
          >
            <Plus size={16} />
            Add Your First Education
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {education.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-purple-300">
                  Education Entry {index + 1}
                </h3>
                {education.length > 1 && (
                  <button
                    onClick={() => removeEducation(entry.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-purple-300 text-sm font-semibold mb-2 block">
                    Degree
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Bachelor of Science"
                    value={entry.degree}
                    onChange={(e) => updateEducation(entry.id, 'degree', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
                  />
                </div>

                <div>
                  <label className="text-purple-300 text-sm font-semibold mb-2 block">
                    Institution
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., University Name"
                    value={entry.institution}
                    onChange={(e) => updateEducation(entry.id, 'institution', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
                  />
                </div>

                <div>
                  <label className="text-purple-300 text-sm font-semibold mb-2 block">
                    Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2020-2024"
                    value={entry.year}
                    onChange={(e) => updateEducation(entry.id, 'year', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
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
