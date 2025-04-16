'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Video = {
  id: string
  title: string         // Changed from video_title
  description: string
  videoYTId: string     // Changed from video_link
  sectionTitle: string  // New field
  watched_fully: boolean
  skill: number
  OTT: boolean
  APP: boolean
  ARG: boolean
  PUTT: boolean
}

type Section = {
  id: string
  name: string
  description: string
  skill: string
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [newVideo, setNewVideo] = useState<Omit<Video, 'id'>>({
    title: '',             // Changed from video_title
    description: '',
    videoYTId: '',         // Changed from video_link
    sectionTitle: '',      // New field
    watched_fully: false,
    skill: 1,
    OTT: false,
    APP: false,
    ARG: false,
    PUTT: false,
  })

  // Fetch videos
  const fetchVideos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('id', { ascending: false })
    if (!error && data) setVideos(data)
    setLoading(false)
  }

  // Fetch sections
  const fetchSections = async () => {
    const { data, error } = await supabase.from('sections').select('*')
    if (!error && data) setSections(data)
  }

  useEffect(() => {
    fetchVideos()
    fetchSections()
  }, [])

  // Handle section checkbox
  const handleSectionCheckbox = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(sectionId => sectionId !== id) : [...prev, id]
    )
  }

  // Add video handler
  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    try {
      // Insert video
      const { data: video, error } = await supabase
        .from('videos')
        .insert([newVideo])
        .select()
        .single()

      if (error) {
        setErrorMsg(error.message)
        setIsSaving(false)
        return
      }

      // Link to sections if any selected
      if (video && selectedSections.length > 0) {
        const relations = selectedSections.map(sectionId => ({
          section_id: sectionId,
          video_id: video.id,
        }))
        const { error: relError } = await supabase
          .from('section_videos')
          .insert(relations)
        if (relError) {
          setErrorMsg('Video created, but failed to link to sections.')
        }
      }

      // Success: refresh, reset, close modal
      await fetchVideos()
      setIsModalOpen(false)
      setNewVideo({
        title: '',          // Changed from video_title
        description: '',
        videoYTId: '',      // Changed from video_link
        sectionTitle: '',   // New field
        watched_fully: false,
        skill: 1,
        OTT: false,
        APP: false,
        ARG: false,
        PUTT: false,
      })
      setSelectedSections([])
    } catch (err: any) {
      setErrorMsg('Unexpected error: ' + (err?.message || String(err)))
    }
    setIsSaving(false)
  }

  return (
    <div className="flex min-h-screen bg-[#18181b] text-white">
      {/* Sidebar (simplified) */}
      <aside className="w-64 bg-[#232329] p-6 flex flex-col">
        <div className="mb-8 font-bold text-lg">Michael Dutro</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Video List</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <span className="mr-2 text-xl">+</span> Add Video
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#232329] rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#232329] text-gray-400">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Section Title</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">YouTube ID</th>
                <th className="px-4 py-3 text-left">Watched</th>
                <th className="px-4 py-3 text-left">Skill</th>
                <th className="px-4 py-3 text-left">OTT</th>
                <th className="px-4 py-3 text-left">APP</th>
                <th className="px-4 py-3 text-left">ARG</th>
                <th className="px-4 py-3 text-left">PUTT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-6">Loading...</td>
                </tr>
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-gray-400">
                    No videos found. Click the + button to add one.
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id} className="border-b border-[#2c2c34] hover:bg-[#23232b]">
                    <td className="px-4 py-3">{video.id}</td>
                    <td className="px-4 py-3">{video.title}</td>
                    <td className="px-4 py-3">{video.sectionTitle}</td>
                    <td className="px-4 py-3">{video.description}</td>
                    <td className="px-4 py-3">{video.videoYTId}</td>
                    <td className="px-4 py-3">{video.watched_fully ? '✅' : ''}</td>
                    <td className="px-4 py-3">{video.skill}</td>
                    <td className="px-4 py-3">{video.OTT ? '✅' : ''}</td>
                    <td className="px-4 py-3">{video.APP ? '✅' : ''}</td>
                    <td className="px-4 py-3">{video.ARG ? '✅' : ''}</td>
                    <td className="px-4 py-3">{video.PUTT ? '✅' : ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Video Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#232329] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New Video</h2>
              {errorMsg && (
                <div className="mb-4 text-red-400">{errorMsg}</div>
              )}
              <form onSubmit={addVideo}>
                <div className="mb-4">
                  <label className="block mb-2">Video Title</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="Video Title"
                    value={newVideo.title}
                    onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Section Title</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="Section Title"
                    value={newVideo.sectionTitle}
                    onChange={e => setNewVideo({ ...newVideo, sectionTitle: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Description</label>
                  <textarea
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="Description"
                    value={newVideo.description}
                    onChange={e => setNewVideo({ ...newVideo, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">YouTube Video ID</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="YouTube Video ID"
                    value={newVideo.videoYTId}
                    onChange={e => setNewVideo({ ...newVideo, videoYTId: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Watched Fully</label>
                  <input
                    type="checkbox"
                    checked={newVideo.watched_fully}
                    onChange={() => setNewVideo({ ...newVideo, watched_fully: !newVideo.watched_fully })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Skill</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    type="number"
                    min={1}
                    max={3}
                    value={newVideo.skill}
                    onChange={e => setNewVideo({ ...newVideo, skill: parseInt(e.target.value) })}
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newVideo.OTT}
                      onChange={() => setNewVideo({ ...newVideo, OTT: !newVideo.OTT })}
                      className="mr-2"
                    />
                    OTT
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newVideo.APP}
                      onChange={() => setNewVideo({ ...newVideo, APP: !newVideo.APP })}
                      className="mr-2"
                    />
                    APP
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newVideo.ARG}
                      onChange={() => setNewVideo({ ...newVideo, ARG: !newVideo.ARG })}
                      className="mr-2"
                    />
                    ARG
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newVideo.PUTT}
                      onChange={() => setNewVideo({ ...newVideo, PUTT: !newVideo.PUTT })}
                      className="mr-2"
                    />
                    PUTT
                  </label>
                </div>
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Assign to Sections:</h2>
                  <div className="max-h-40 overflow-y-auto bg-[#18181b] p-2 rounded-md">
                    {sections.map(section => (
                      <label key={section.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.id)}
                          onChange={() => handleSectionCheckbox(section.id)}
                          className="mr-2"
                        />
                        <span>{section.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
                    {isSaving ? 'Adding...' : 'Add Video'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
