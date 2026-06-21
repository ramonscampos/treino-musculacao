import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import type { User } from '../types'

const STORAGE_KEY = 'iron_user_id'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { rows } = await db.execute('SELECT id, name FROM users ORDER BY id')
      const allUsers = rows.map(r => ({ id: r.id as number, name: r.name as string }))
      setUsers(allUsers)
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const found = allUsers.find(u => u.id === +savedId)
        if (found) setUser(found)
      }
      setLoading(false)
    }
    init()
  }, [])

  function selectUser(u: User) {
    localStorage.setItem(STORAGE_KEY, String(u.id))
    setUser(u)
  }

  return { user, users, loading, selectUser }
}
