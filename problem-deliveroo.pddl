;; problem file: problem-deliveroo.pddl
(define (problem default)
    (:domain deliveroo)
    (:objects
        a1 a2 a3 a4 a5 a6 a7 a8 a9 a10 - tile
        agent1 - agent
        parcel1 - parcel
    )
    (:init
        (me agent1)
        (at agent1 a1)
        (at parcel1 a5)
        (right a1 a2) (right a2 a3) (right a3 a4) (right a4 a5)
        (left a2 a1) (left a3 a2) (left a4 a3) (left a5 a4)
        (up a6 a1) (up a7 a2) (up a8 a3) (up a9 a4) (up a10 a5)
        (down a1 a6) (down a2 a7) (down a3 a8) (down a4 a9) (down a5 a10)
        (delivery a10)
    )
    (:goal
        (and
            (at agent1 a10)
            (at parcel1 a10)
        )
    )
)
