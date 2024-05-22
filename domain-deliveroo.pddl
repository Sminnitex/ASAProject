;; domain file: domain-deliveroo.pddl
(define (domain deliveroo)
    (:requirements :strips :typing)
    (:types
        tile
        agent
        parcel
    )
    (:predicates
        (delivery ?t - tile)
        (me ?a - agent)
        (at ?x - (either agent parcel) ?t - tile)
        (right ?t1 ?t2 - tile)
        (left ?t1 ?t2 - tile)
        (up ?t1 ?t2 - tile)
        (down ?t1 ?t2 - tile)
    )
    
    ;; Action to move right
    (:action right
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (right ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to move left
    (:action left
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (left ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to move up
    (:action up
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (up ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to move down
    (:action down
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (down ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )
)
