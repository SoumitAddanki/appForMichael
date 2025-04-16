'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Video = {
  id: string;
  title: string;
  description: string;
  videoYTId: string;
  sectionTitle: string;
  watched_fully: boolean;
  skill: number;
};

type Section = {
  id: string;
  name: string;
};

type Tag = {
  id: number;
  tag: string;
  videoId: string;
};

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // form state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [form, setForm] = useState<Omit<Video, 'id'>>({
    title: '',
    description: '',
    videoYTId: '',
    sectionTitle: '',
    watched_fully: false,
    skill: 1,
  });

  // Fetch data
  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('id', { ascending: false });
    if (data) setVideos(data);
    setLoading(false);
  };
  const fetchSections = async () => {
    const { data } = await supabase.from('sections').select('*');
    if (data) setSections(data);
  };

  useEffect(() => {
    fetchVideos();
    fetchSections();
  }, []);

  // Open Add vs Edit
  const openAddModal = () => {
    setEditingVideo(null);
    setForm({
      title: '',
      description: '',
      videoYTId: '',
      sectionTitle: '',
      watched_fully: false,
      skill: 1,
    });
    setTags([]);
    setSelectedSections([]);
    setErrorMsg(null);
    setIsModalOpen(true);
  };
  const openEditModal = async (video: Video) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      description: video.description,
      videoYTId: video.videoYTId,
      sectionTitle: video.sectionTitle,
      watched_fully: video.watched_fully,
      skill: video.skill,
    });
    // load its tags
    const { data: tagData } = await supabase
      .from<Tag>('tags')
      .select('tag')
      .eq('videoId', video.id);
    setTags(tagData?.map((t) => t.tag) || []);
    // load its sections
    const { data: rels } = await supabase
      .from('section_videos')
      .select('section_id')
      .eq('video_id', video.id);
    setSelectedSections(rels?.map((r) => r.section_id) || []);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // tag logic
  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // section checkbox
  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // submit handlers
  const handleSubmit = (e: React.FormEvent) =>
    editingVideo ? updateVideo(e) : addVideo(e);

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
  
    const { data: video, error } = await supabase
      .from<Video>('videos')
      .insert([{
        title:      form.title,
        description:form.description,
        videoYTId:  form.videoYTId,    // <-- camelCase
        sectionTitle: form.sectionTitle,// <-- camelCase
        watched_fully: form.watched_fully,
        skill:      form.skill,
      }])
      .select()
      .single();
  
    if (error || !video) {
      console.error('Insert error:', error);
      setErrorMsg(error?.message || 'Insert failed');
      setIsSaving(false);
      return;
    }
  
    await syncTagsAndSections(video.id);
    await fetchVideos();
    setIsModalOpen(false);
    setIsSaving(false);
  };

const updateVideo = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingVideo) return;
  setIsSaving(true);
  setErrorMsg(null);

  // 1) Update and ask for the new row back:
  const { data: updated, error } = await supabase
    .from<Video>('videos')
    .update(
      {
        title:         form.title,
        description:   form.description,
        videoYTId:     form.videoYTId,
        sectionTitle:  form.sectionTitle,
        watched_fully: form.watched_fully,
        skill:         form.skill,
      },
      { returning: 'representation' }
    )
    .eq('id', editingVideo.id)
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    setErrorMsg(error.message);
    setIsSaving(false);
    return;
  }

  // 2) Sync tags & sections
  await syncTagsAndSections(editingVideo.id);

  // 3) Refresh list & close
  await fetchVideos();
  setEditingVideo(null);
  setIsSaving(false);
  setIsModalOpen(false);
};

  // helper to sync tags & sections
  const syncTagsAndSections = async (videoId: string) => {
    // tags
    await supabase.from('tags').delete().eq('videoId', videoId);
    if (tags.length) {
      await supabase.from('tags').insert(
        tags.map((tag) => ({ videoId, tag }))
      );
    }
    // sections
    await supabase.from('section_videos').delete().eq('video_id', videoId);
    if (selectedSections.length) {
      await supabase.from('section_videos').insert(
        selectedSections.map((sid) => ({
          video_id: sid,
          section_id: sid,
        }))
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#18181b] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#232329] p-6">
        <div className="font-bold text-lg">Michael Dutro</div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-10">
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-semibold">Video List</h1>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            + Add Video
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#232329] rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#232329] text-gray-400">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Section</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">YouTube ID</th>
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="px-4 py-3 text-left">Watched</th>
                <th className="px-4 py-3 text-left">Skill</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-400">
                    No videos found.
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-[#2c2c34] hover:bg-[#23232b]"
                  >
                    <td className="px-4 py-3">{v.id}</td>
                    <td className="px-4 py-3">{v.title}</td>
                    <td className="px-4 py-3">{v.sectionTitle}</td>
                    <td className="px-4 py-3">{v.description}</td>
                    <td className="px-4 py-3">{v.videoYTId}</td>
                    <td className="px-4 py-3">
                      {/* reuse your TagsList */}
                    </td>
                    <td className="px-4 py-3">
                      {v.watched_fully ? '✅' : ''}
                    </td>
                    <td className="px-4 py-3">{v.skill}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(v)}
                        className="text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal (Add/Edit) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#232329] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </h2>
              {errorMsg && (
                <div className="mb-4 text-red-400">{errorMsg}</div>
              )}
              <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className="mb-4">
                  <label className="block mb-2">Video Title</label>
                  <input
                    className="w-full p-2 text-black rounded-md"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </div>
                {/* Section */}
                <div className="mb-4">
                  <label className="block mb-2">Section Title</label>
                  <input
                    className="w-full p-2 text-black rounded-md"
                    value={form.sectionTitle}
                    onChange={(e) =>
                      setForm({ ...form, sectionTitle: e.target.value })
                    }
                  />
                </div>
                {/* Description */}
                <div className="mb-4">
                  <label className="block mb-2">Description</label>
                  <textarea
                    className="w-full p-2 text-black rounded-md"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                {/* YouTube ID */}
                <div className="mb-4">
                  <label className="block mb-2">YouTube ID</label>
                  <input
                    className="w-full p-2 text-black rounded-md"
                    value={form.videoYTId}
                    onChange={(e) =>
                      setForm({ ...form, videoYTId: e.target.value })
                    }
                    required
                  />
                </div>
                {/* Watched */}
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={form.watched_fully}
                    onChange={() =>
                      setForm({
                        ...form,
                        watched_fully: !form.watched_fully,
                      })
                    }
                    className="mr-2"
                  />
                  <label>Watched Fully</label>
                </div>
                {/* Skill */}
                <div className="mb-4">
                  <label className="block mb-2">Skill</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    className="w-full p-2 text-black rounded-md"
                    value={form.skill}
                    onChange={(e) =>
                      setForm({ ...form, skill: Number(e.target.value) })
                    }
                  />
                </div>
                {/* Tags */}
                <div className="mb-4">
                  <label className="block mb-2">Tags</label>
                  <div className="flex mb-2">
                    <input
                      className="flex-1 p-2 text-black rounded-md"
                      placeholder="Enter a tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(), handleAddTag())
                      }
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="bg-[#27272f] px-2 py-1 rounded-md flex items-center"
                      >
                        {t}
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="ml-2 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {/* Sections */}
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Assign to Sections:</h2>
                  <div className="max-h-40 overflow-y-auto bg-[#18181b] p-2 rounded-md">
                    {sections.map((sec) => (
                      <label
                        key={sec.id}
                        className="flex items-center mb-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(sec.id)}
                          onChange={() => toggleSection(sec.id)}
                          className="mr-2"
                        />
                        <span>{sec.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#18181b] text-white rounded-md hover:bg-[#27272f]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : editingVideo ? 'Save' : 'Add Video'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
